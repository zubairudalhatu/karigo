import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  NotificationType,
  OrderPaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ServiceCategory,
  WalletLedgerDirection,
  WalletLedgerEntryStatus,
  WalletLedgerEntryType,
  WalletStatus
} from "@prisma/client";
import type { PublicPaymentConfig } from "@karigo/shared-types";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { InitiateWalletTopUpDto } from "./dto/initiate-wallet-top-up.dto";
import { SandboxInitializationTestProvider } from "./dto/test-payment-provider.dto";
import { CustomerTestPaymentProviderName, PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { InitializePaymentResult, PaymentProvider, PaymentProviderName, PaymentWebhookContext } from "./providers/payment-provider.interface";
import {
  PaymentProviderInitializationException,
  paymentInitializationDiagnostic
} from "./providers/payment-provider-diagnostics";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { NotificationsService } from "../notifications/notifications.service";

type TransactionClient = Prisma.TransactionClient;
type ReadinessStatus = "READY" | "WAITING_FOR_CONFIGURATION" | "BLOCKED";

interface ProviderRequirement {
  name: string;
  required: boolean;
  configured: boolean;
  purpose: string;
  issue?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService
  ) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customer: { userId } },
      include: { customer: { include: { user: true } } }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
      throw new ConflictException("Order has already been paid");
    }
    if (order.paymentStatus === PaymentStatus.CASH_PENDING || order.paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY) {
      throw new BadRequestException("Cash/POD orders cannot start electronic payment");
    }
    if (order.orderStatus !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException("Order is not awaiting payment");
    }
    if (!order.totalAmount.equals(new Prisma.Decimal(dto.amount))) {
      throw new BadRequestException("Payment amount does not match the order total");
    }

    const provider = dto.paymentProvider
      ? this.providerRegistry.customerTestProvider(dto.paymentProvider)
      : this.providerRegistry.active();
    if (!this.providerRegistry.customerCheckoutProviders().includes(provider.name as CustomerTestPaymentProviderName)) {
      throw new BadRequestException("Customer electronic checkout is temporarily unavailable");
    }
    const transactionReference = this.transactionReference(provider.name);
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        gateway: provider.name,
        transactionReference,
        amount: order.totalAmount,
        currency: "NGN",
        paymentMethod: dto.paymentMethod,
        paymentPurpose: PaymentPurpose.ORDER_PAYMENT,
        paymentStatus: PaymentStatus.PENDING
      }
    });
    let authorization;
    try {
      authorization = await provider.initialize({
        transactionReference,
        amount: order.totalAmount.toFixed(2),
        currency: payment.currency,
        customerEmail: order.customer.user.email,
        customerPhone: order.customer.user.phoneNumber,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentId: payment.id,
          selectedPaymentProvider: dto.paymentProvider ?? "environment-default"
        }
      });
    } catch (error) {
      await this.recordInitializationFailure(payment.id, order.id, order.orderNumber, userId, provider.name, error);
      throw this.safeInitializationException(provider.name, error);
    }

    const initializedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayResponse: authorization.providerResponse as Prisma.InputJsonValue }
    }) ?? payment;

    return { payment: initializedPayment, authorization: this.publicAuthorization(authorization, provider.name, initializedPayment) };
  }

  async initiateWalletTopUp(userId: string, dto: InitiateWalletTopUpDto) {
    if (!this.walletTopUpCustomerEnabled()) {
      throw new BadRequestException("Wallet top-up is temporarily unavailable");
    }
    const customer = await this.requireCustomer(userId);
    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    const minimumTopUpAmount = this.walletMinimumTopUpAmount();
    if (amount.lessThan(minimumTopUpAmount)) {
      throw new BadRequestException(`Wallet top-up amount must be at least NGN ${minimumTopUpAmount}`);
    }

    const provider = this.providerRegistry.active();
    if (provider.name !== "flutterwave") {
      throw new BadRequestException("Wallet top-up currently requires Flutterwave as the active provider");
    }
    const transactionReference = this.transactionReference("wallet-topup");

    const { payment, ledger } = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.customerWallet.upsert({
        where: { customerId: customer.id },
        update: {},
        create: { customerId: customer.id }
      });
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException("Only active wallets can be topped up");
      }
      const ledgerEntry = await tx.customerWalletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          customerId: customer.id,
          entryType: WalletLedgerEntryType.TOP_UP,
          direction: WalletLedgerDirection.CREDIT,
          status: WalletLedgerEntryStatus.PENDING,
          amount,
          currency: wallet.currency,
          balanceBefore: wallet.availableBalance,
          balanceAfter: wallet.availableBalance,
          reference: transactionReference,
          sourceType: "PAYMENT",
          description: "Pending wallet top-up"
        }
      });
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: null,
          customerId: customer.id,
          gateway: provider.name,
          transactionReference,
          amount,
          currency: wallet.currency,
          paymentPurpose: PaymentPurpose.WALLET_TOP_UP,
          walletLedgerEntryId: ledgerEntry.id,
          paymentMethod: "flutterwave_wallet_top_up",
          paymentStatus: PaymentStatus.PENDING
        }
      });
      return { payment: paymentRecord, ledger: ledgerEntry };
    });

    let authorization;
    try {
      authorization = await provider.initialize({
        transactionReference,
        amount: amount.toFixed(2),
        currency: payment.currency,
        customerEmail: customer.user.email,
        customerPhone: customer.user.phoneNumber,
        redirectUrl: this.walletTopUpReturnUrl(transactionReference),
        metadata: {
          paymentId: payment.id,
          walletLedgerEntryId: ledger.id,
          purpose: "wallet_top_up",
          returnTarget: "customer_wallet"
        }
      });
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.payment.update({ where: { id: payment.id }, data: { paymentStatus: PaymentStatus.FAILED } }),
        this.prisma.customerWalletLedgerEntry.update({ where: { id: ledger.id }, data: { status: WalletLedgerEntryStatus.FAILED } })
      ]);
      throw this.safeInitializationException(provider.name, error);
    }

    const initializedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayResponse: authorization.providerResponse as Prisma.InputJsonValue }
    }) ?? payment;

    return { payment: initializedPayment, walletLedgerEntry: ledger, authorization: this.publicAuthorization(authorization, provider.name, initializedPayment) };
  }

  async verify(userId: string, transactionReference: string) {
    const payment = await this.requireCustomerPaymentByReference(userId, transactionReference);
    if (payment.paymentStatus === PaymentStatus.SUCCESSFUL) {
      return { payment, alreadyProcessed: true };
    }

    const result = await this.providerRegistry.get(payment.gateway).verify(transactionReference);
    if (!result.successful) {
      throw new BadRequestException("Payment verification was not successful");
    }
    this.assertProviderEvidence(payment.amount, payment.currency, transactionReference, result);

    return {
      payment: await this.processSuccessfulPayment(
        transactionReference,
        result.providerResponse,
        payment.gateway
      ),
      alreadyProcessed: false
    };
  }

  async verifyWalletTopUp(userId: string, transactionReference: string) {
    const payment = await this.requireCustomerPaymentByReference(userId, transactionReference);
    if (payment.paymentPurpose !== PaymentPurpose.WALLET_TOP_UP) {
      throw new BadRequestException("Payment reference is not a wallet top-up");
    }
    if (payment.paymentStatus === PaymentStatus.SUCCESSFUL) {
      return { payment, alreadyProcessed: true };
    }

    const result = await this.providerRegistry.get(payment.gateway).verify(transactionReference);
    if (!result.successful) {
      throw new BadRequestException("Payment verification was not successful");
    }
    this.assertProviderEvidence(payment.amount, payment.currency, transactionReference, result);

    return {
      payment: await this.processSuccessfulPayment(
        transactionReference,
        result.providerResponse,
        payment.gateway
      ),
      alreadyProcessed: false
    };
  }

  providerReadiness() {
    const activeProvider = this.configuredProvider();
    const livePaymentsEnabled = this.livePaymentsEnabled();
    const flutterwaveLiveRequested = this.flutterwaveLiveRequested(livePaymentsEnabled, activeProvider);
    const squadLiveRequested = this.squadLiveRequested(activeProvider);
    const customerSelectableSandboxProviders = this.providerRegistry.customerCheckoutProviders();
    const providers = [
      this.mockReadiness(activeProvider, livePaymentsEnabled),
      this.providerReadinessRecord(
        "flutterwave",
        this.flutterwaveReadinessRequirements(flutterwaveLiveRequested),
        activeProvider,
        livePaymentsEnabled,
        customerSelectableSandboxProviders,
        flutterwaveLiveRequested
      ),
      this.providerReadinessRecord("paystack", [
        this.modeRequirement("PAYSTACK_MODE", ["test"], "Must be test until Paystack provider approval is recorded"),
        this.secretRequirement("PAYSTACK_SECRET_KEY", "Paystack server-side test secret key", "sk_test_"),
        this.optionalRequirement("PAYSTACK_PUBLIC_KEY", "Client-safe public key; not used by the current hosted-checkout backend flow"),
        this.urlRequirement("PAYSTACK_BASE_URL", "Paystack API base URL; defaults to the Paystack API host when omitted"),
        this.optionalRequirement("PAYSTACK_CALLBACK_URL", "Hosted checkout callback URL configured in the provider dashboard"),
        this.optionalRequirement("PAYSTACK_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the test secret if omitted")
      ], activeProvider, livePaymentsEnabled, customerSelectableSandboxProviders),
      this.providerReadinessRecord("monnify", [
        this.modeRequirement("MONNIFY_MODE", ["test", "sandbox"], "Must be test or sandbox until Monnify provider approval is recorded"),
        this.secretRequirement("MONNIFY_API_KEY", "Monnify sandbox API key"),
        this.secretRequirement("MONNIFY_SECRET_KEY", "Monnify sandbox secret key"),
        this.secretRequirement("MONNIFY_CONTRACT_CODE", "Monnify sandbox contract code"),
        this.urlRequirement("MONNIFY_BASE_URL", "Monnify sandbox API base URL; defaults to sandbox when omitted", "api.monnify.com"),
        this.optionalRequirement("MONNIFY_CALLBACK_URL", "Monnify checkout redirect URL configured in the provider dashboard"),
        this.optionalRequirement("MONNIFY_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the sandbox secret if omitted")
      ], activeProvider, livePaymentsEnabled, customerSelectableSandboxProviders),
      this.providerReadinessRecord(
        "squad",
        this.squadReadinessRequirements(squadLiveRequested),
        activeProvider,
        livePaymentsEnabled,
        customerSelectableSandboxProviders,
        squadLiveRequested
      )
    ];

    return {
      activeProvider,
      legacyActiveProvider: this.optionalValue("PAYMENT_PROVIDER") ? "configured" : "not_configured",
      paymentsLiveEnabled: livePaymentsEnabled,
      customerSelectableSandboxProviders,
      providerEnabledFlags: {
        PAYMENTS_PROVIDER: this.optionalValue("PAYMENTS_PROVIDER") ? "configured" : "default_or_unset",
        PAYMENT_PROVIDER: this.optionalValue("PAYMENT_PROVIDER") ? "configured" : "default_or_unset",
        PAYMENTS_LIVE_ENABLED: livePaymentsEnabled ? "true" : "false_or_unset",
        FLUTTERWAVE_API_MODE: this.optionalValue("FLUTTERWAVE_API_MODE") ? this.flutterwaveApiMode() : "default_v3",
        FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: this.optionalValue("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED")?.toLowerCase() === "true"
          ? "true"
          : "false_or_unset",
        SQUAD_CUSTOMER_CHECKOUT_ENABLED: this.optionalValue("SQUAD_CUSTOMER_CHECKOUT_ENABLED")?.toLowerCase() === "true"
          ? "true"
          : "false_or_unset",
        CASH_ON_DELIVERY_ENABLED: this.flagValue("CASH_ON_DELIVERY_ENABLED", false) ? "true" : "false_or_unset",
        WALLET_TOP_UP_ENABLED: this.flagValue("WALLET_TOP_UP_ENABLED", false) ? "true" : "false_or_unset",
        WALLET_PAYMENTS_ENABLED: this.flagValue("WALLET_PAYMENTS_ENABLED", false) ? "true" : "false_or_unset",
        UTILITIES_PROVIDER: this.optionalValue("UTILITIES_PROVIDER") ?? "mock",
        UTILITIES_ENABLED: this.flagValue("UTILITIES_ENABLED", false) ? "true" : "false_or_unset",
        UTILITIES_TEST_MODE: this.flagValue("UTILITIES_TEST_MODE", true) ? "true" : "false",
        UTILITIES_CUSTOMER_PURCHASE_ENABLED: this.flagValue("UTILITIES_CUSTOMER_PURCHASE_ENABLED", false) ? "true" : "false_or_unset",
        ACCELERATE_ENABLED: this.flagValue("ACCELERATE_ENABLED", false) ? "true" : "false_or_unset"
      },
      launchPaymentOptions: this.launchPaymentOptions(),
      utilityReadiness: this.utilityReadiness(),
      webhookRoutes: {
        paystack: "/api/v1/payments/webhook/paystack",
        flutterwave: "/api/v1/payments/webhook/flutterwave",
        monnify: "/api/v1/payments/webhook/monnify",
        squad: "/api/v1/payments/webhook/squad"
      },
      providers,
      liveActivation: this.flutterwaveLiveActivationReadiness(activeProvider)
    };
  }

  publicPaymentConfig(): PublicPaymentConfig {
    const activeProvider = this.configuredProvider();
    const livePaymentsEnabled = this.livePaymentsEnabled();
    const customerSelectableProviders = this.providerRegistry.customerCheckoutProviders();
    const liveActivation = this.flutterwaveLiveActivationReadiness(activeProvider);
    const flutterwaveCustomerCheckoutEnabled = this.flutterwaveCustomerCheckoutEnabled();
    const squadCustomerCheckoutEnabled = this.squadCustomerCheckoutEnabled();
    const flutterwaveVisible = customerSelectableProviders.includes("flutterwave");
    const squadVisible = customerSelectableProviders.includes("squad");

    return {
      livePaymentsEnabled,
      activeProvider,
      customerSelectableProviders,
      launchProviderLabel: livePaymentsEnabled ? "Flutterwave" : "Staging payment providers",
      mockPaymentVisible: customerSelectableProviders.includes("mock") && !livePaymentsEnabled,
      flutterwaveCustomerCheckoutEnabled,
      flutterwaveReady: flutterwaveVisible && (!livePaymentsEnabled || liveActivation.status === "READY"),
      squadCustomerCheckoutEnabled,
      squadReady: squadVisible && !livePaymentsEnabled,
      monnifyVisible: customerSelectableProviders.includes("monnify") && !livePaymentsEnabled,
      paystackVisible: customerSelectableProviders.includes("paystack") && !livePaymentsEnabled,
      cashPaymentEnabled: this.flagValue("CASH_ON_DELIVERY_ENABLED", false),
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Pay on Delivery is available for supported KariGO orders.",
      walletTopUpEnabled: this.walletTopUpCustomerEnabled(),
      walletPaymentsEnabled: this.flagValue("WALLET_PAYMENTS_ENABLED", false),
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: this.walletMinimumTopUpAmount(),
      walletPaymentNote: this.walletTopUpCustomerEnabled()
        ? "Wallet top-up credits only after Flutterwave verification. Wallet order payment is not active yet."
        : "Wallet top-up is temporarily unavailable.",
      launchCities: ["Kano", "Abuja"]
    };
  }

  async testProviderInitialization(providerName: SandboxInitializationTestProvider) {
    const provider = this.providerRegistry.get(providerName);
    const transactionReference = this.transactionReference(`${provider.name}-test`);
    const timestamp = new Date().toISOString();
    if (this.livePaymentsEnabled() || this.providerMode(provider.name).toLowerCase() === "live") {
      return {
        success: false,
        provider: provider.name,
        mode: this.providerMode(provider.name),
        stage: "config-read",
        transactionReference,
        providerMessage: "Sandbox initialization tests are disabled while live payment mode is configured.",
        message: "Provider sandbox initialization could not be completed.",
        timestamp
      };
    }
    const input = {
      transactionReference,
      amount: "100.00",
      currency: "NGN",
      customerEmail: `checkout+${this.safeReference(transactionReference)}@sandbox.karigo.com.ng`,
      customerPhone: "+2348000000000",
      metadata: {
        purpose: "admin-provider-readiness-test",
        provider: provider.name,
        generatedBy: "admin-payment-readiness"
      }
    };

    try {
      const result = await provider.initialize(input);
      this.logger.log(
        `Payment provider initialization test succeeded provider=${provider.name} mode=${this.providerMode(provider.name)} stage=initialize-transaction reference=${transactionReference} authorizationUrlPresent=${Boolean(result.authorizationUrl)}`
      );
      return {
        success: true,
        provider: provider.name,
        mode: this.providerMode(provider.name),
        stage: "initialize-transaction",
        transactionReference,
        authorizationUrlPresent: Boolean(result.authorizationUrl),
        accessCodePresent: Boolean(result.accessCode),
        providerMessage: "Provider accepted sandbox initialization request.",
        timestamp
      };
    } catch (error) {
      const diagnostic = paymentInitializationDiagnostic(provider.name, error);
      this.logger.warn(
        `Payment provider initialization test failed provider=${provider.name} mode=${this.providerMode(provider.name)} stage=${diagnostic.stage} status=${diagnostic.httpStatusCode ?? "n/a"} reason=${diagnostic.providerMessage ?? diagnostic.message}`
      );
      return {
        success: false,
        provider: provider.name,
        mode: this.providerMode(provider.name),
        stage: diagnostic.stage,
        transactionReference,
        httpStatusCode: diagnostic.httpStatusCode,
        providerMessage: diagnostic.providerMessage ?? diagnostic.message,
        message: "Provider sandbox initialization could not be completed.",
        timestamp
      };
    }
  }

  async webhook(gateway: string, payload: Record<string, unknown>, context?: PaymentWebhookContext) {
    const provider = this.providerRegistry.get(gateway);
    const result = await provider.parseWebhook(payload, context);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookLog.create({
          data: {
            gateway: provider.name,
            eventType: result.eventType,
            transactionReference: result.transactionReference,
            payload: result.providerResponse as Prisma.InputJsonValue,
            isVerified: result.verified,
            processedAt: new Date()
          }
        });

        if (!result.verified || !result.successful || !result.transactionReference) {
          return { processed: false, reason: "Webhook was not a verified successful payment" };
        }
        const payment = await tx.payment.findUnique({ where: { transactionReference: result.transactionReference } });
        if (!payment) throw new NotFoundException("Payment not found");
        this.assertProviderEvidence(payment.amount, payment.currency, result.transactionReference, {
          ...result,
          transactionReference: result.transactionReference
        });

        return {
          processed: true,
          payment: await this.processSuccessfulPaymentWithClient(
            tx,
            result.transactionReference,
            result.providerResponse,
            provider.name
          )
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { processed: false, duplicate: true };
      }
      throw error;
    }
  }

  async requestRefund(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, customer: { userId } },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.paymentStatus === PaymentStatus.REFUND_PENDING) {
      return payment;
    }
    if (payment.paymentStatus !== PaymentStatus.SUCCESSFUL) {
      throw new BadRequestException("Only successful payments can be refunded");
    }
    if (!payment.order || !payment.orderId) {
      throw new BadRequestException("Wallet top-up refunds require manual admin wallet review");
    }
    const order = payment.order;
    const orderId = payment.orderId;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING }
      });
      const shouldMoveToRefundRequested = order.orderStatus !== OrderStatus.REFUND_REQUESTED;
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.REFUND_PENDING,
          ...(shouldMoveToRefundRequested
            ? {
                orderStatus: OrderStatus.REFUND_REQUESTED,
                statusHistory: {
                  create: {
                    previousStatus: order.orderStatus,
                    newStatus: OrderStatus.REFUND_REQUESTED,
                    changedByUserId: userId,
                    changedByRole: "CUSTOMER",
                    note: "Customer requested a refund"
                  }
                }
              }
            : {})
        }
      });
      return updatedPayment;
    });
    await this.notifications.createNotification({ userId, title: "Refund requested", message: "Your refund request is awaiting review.", type: NotificationType.REFUND_REQUESTED, entityType: "Payment", entityId: paymentId });
    return result;
  }

  async approveRefund(adminUserId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.paymentStatus === PaymentStatus.REFUNDED) {
      return payment;
    }
    if (payment.paymentStatus !== PaymentStatus.REFUND_PENDING) {
      throw new BadRequestException("Payment does not have a pending refund request");
    }
    if (!payment.order || !payment.orderId) {
      throw new BadRequestException("Wallet top-up refunds require manual wallet adjustment review");
    }
    const order = payment.order;
    const orderId = payment.orderId;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUNDED }
      });
      if (order.orderStatus !== OrderStatus.REFUNDED) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
            statusHistory: {
              create: {
                previousStatus: order.orderStatus,
                newStatus: OrderStatus.REFUNDED,
                changedByUserId: adminUserId,
                changedByRole: "ADMIN",
                note: "Admin approved refund"
              }
            }
          }
        });
      }
      return updatedPayment;
    });
    await this.audit.record(adminUserId, "payment.refund.approved", "Payment", paymentId, { orderId: payment.orderId });
    const customer = await this.prisma.customerProfile.findUnique({ where: { id: payment.customerId }, select: { userId: true } });
    if (customer) await this.notifications.createNotification({ userId: customer.userId, title: "Refund approved", message: "Your refund request has been approved.", type: NotificationType.REFUND_APPROVED, entityType: "Payment", entityId: paymentId });
    return result;
  }

  private processSuccessfulPayment(
    transactionReference: string,
    providerResponse: Record<string, unknown>,
    expectedGateway: string
  ) {
    return this.prisma.$transaction((tx) =>
      this.processSuccessfulPaymentWithClient(tx, transactionReference, providerResponse, expectedGateway)
    );
  }

  private async processSuccessfulPaymentWithClient(
    tx: TransactionClient,
    transactionReference: string,
    providerResponse: Record<string, unknown>,
    expectedGateway: string
  ) {
    const payment = await tx.payment.findUnique({
      where: { transactionReference },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.gateway !== expectedGateway) {
      throw new BadRequestException("Payment gateway does not match the transaction");
    }
    if (payment.paymentStatus === PaymentStatus.SUCCESSFUL) {
      return payment;
    }
    if (payment.paymentPurpose === PaymentPurpose.WALLET_TOP_UP) {
      return this.processSuccessfulWalletTopUpWithClient(tx, payment, providerResponse);
    }
    if (!payment.order || !payment.orderId) {
      throw new BadRequestException("Order payment record is missing its order");
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        paidAt: new Date(),
        gatewayResponse: providerResponse as Prisma.InputJsonValue
      }
    });

    const shouldMoveToPaid = payment.order.orderStatus === OrderStatus.AWAITING_PAYMENT;
    const isDispatchReadyParcel =
      shouldMoveToPaid && payment.order.serviceCategory === ServiceCategory.PARCEL;
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        ...(shouldMoveToPaid
          ? {
              orderStatus: isDispatchReadyParcel ? OrderStatus.READY_FOR_PICKUP : OrderStatus.PAID,
              statusHistory: {
                create: isDispatchReadyParcel
                  ? [
                      {
                        previousStatus: OrderStatus.AWAITING_PAYMENT,
                        newStatus: OrderStatus.PAID,
                        changedByRole: "SYSTEM",
                        note: `Payment verified through ${payment.gateway}`
                      },
                      {
                        previousStatus: OrderStatus.PAID,
                        newStatus: OrderStatus.READY_FOR_PICKUP,
                        changedByRole: "SYSTEM",
                        note: "Paid parcel request is ready for dispatch"
                      }
                    ]
                  : {
                      previousStatus: OrderStatus.AWAITING_PAYMENT,
                      newStatus: OrderStatus.PAID,
                      changedByRole: "SYSTEM",
                      note: `Payment verified through ${payment.gateway}`
                    }
              }
            }
          : {})
      }
    });
    if (payment.order.promoCodeId && payment.order.discountAmount.greaterThan(0)) {
      const existingUsage = await tx.promoCodeUsage.findUnique({
        where: {
          promoCodeId_orderId: {
            promoCodeId: payment.order.promoCodeId,
            orderId: payment.orderId
          }
        }
      });
      if (!existingUsage) {
        await tx.promoCodeUsage.create({
          data: {
            promoCodeId: payment.order.promoCodeId,
            customerId: payment.customerId,
            orderId: payment.orderId,
            discountAmount: payment.order.discountAmount
          }
        });
        await tx.promoCode.update({
          where: { id: payment.order.promoCodeId },
          data: { usageCount: { increment: 1 } }
        });
      }
    }
    const customer = await tx.customerProfile.findUnique({ where: { id: payment.customerId }, select: { userId: true } });
    if (customer) {
      await tx.notification.create({ data: { userId: customer.userId, title: "Payment successful", message: `Payment for order ${payment.order.orderNumber} was successful.`, type: NotificationType.PAYMENT_SUCCESSFUL, entityType: "Order", entityId: payment.orderId } });
    }
    if (payment.order.vendorId) {
      const vendor = await tx.vendor.findUnique({ where: { id: payment.order.vendorId }, select: { userId: true } });
      if (vendor) await tx.notification.create({ data: { userId: vendor.userId, title: "New paid order", message: `Order ${payment.order.orderNumber} is ready for confirmation.`, type: NotificationType.PAYMENT_SUCCESSFUL, entityType: "Order", entityId: payment.orderId } });
    }
    return updatedPayment;
  }

  private async processSuccessfulWalletTopUpWithClient(
    tx: TransactionClient,
    payment: Prisma.PaymentGetPayload<{ include: { order: true } }>,
    providerResponse: Record<string, unknown>
  ) {
    if (!payment.walletLedgerEntryId) {
      throw new BadRequestException("Wallet top-up payment is missing its ledger entry");
    }
    const ledger = await tx.customerWalletLedgerEntry.findUnique({
      where: { id: payment.walletLedgerEntryId }
    });
    if (!ledger) {
      throw new NotFoundException("Wallet top-up ledger entry not found");
    }
    if (ledger.status === WalletLedgerEntryStatus.POSTED) {
      return payment;
    }
    if (ledger.status !== WalletLedgerEntryStatus.PENDING) {
      throw new BadRequestException("Wallet top-up ledger entry is not pending");
    }
    const wallet = await tx.customerWallet.findUnique({
      where: { id: ledger.walletId }
    });
    if (!wallet) {
      throw new NotFoundException("Customer wallet not found");
    }
    if (wallet.status !== WalletStatus.ACTIVE) {
      throw new BadRequestException("Only active wallets can receive top-up credit");
    }
    const now = new Date();
    const balanceBefore = wallet.availableBalance;
    const balanceAfter = wallet.availableBalance.add(payment.amount);
    await tx.customerWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: balanceAfter,
        ledgerBalance: balanceAfter,
        lastActivityAt: now
      }
    });
    await tx.customerWalletLedgerEntry.update({
      where: { id: ledger.id },
      data: {
        status: WalletLedgerEntryStatus.POSTED,
        balanceBefore,
        balanceAfter,
        sourceId: payment.id,
        description: `${this.providerLabel(payment.gateway)} wallet top-up verified`,
        metadata: {
          paymentId: payment.id,
          provider: payment.gateway,
          transactionReference: payment.transactionReference
        } as Prisma.InputJsonValue,
        postedAt: now
      }
    });
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        paidAt: now,
        gatewayResponse: providerResponse as Prisma.InputJsonValue
      }
    });
    const customer = await tx.customerProfile.findUnique({ where: { id: payment.customerId }, select: { userId: true } });
    if (customer) {
      await tx.notification.create({
        data: {
          userId: customer.userId,
          title: "Wallet top-up successful",
          message: `Your KariGO Wallet was credited with NGN ${payment.amount.toFixed(2)}.`,
          type: NotificationType.PAYMENT_SUCCESSFUL,
          entityType: "CustomerWalletLedgerEntry",
          entityId: ledger.id
        }
      });
    }
    return updatedPayment;
  }

  private async requireCustomerPaymentByReference(userId: string, transactionReference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionReference, customer: { userId } },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    return payment;
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } } }
    });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }
    return customer;
  }

  private publicAuthorization(
    authorization: InitializePaymentResult,
    provider: PaymentProviderName,
    payment: { transactionReference: string; amount: Prisma.Decimal; currency: string }
  ) {
    const authorizationAliases = authorization as InitializePaymentResult & {
      checkoutUrl?: string | null;
      paymentUrl?: string | null;
      url?: string | null;
    };
    const authorizationUrl = [
      authorization.authorizationUrl,
      authorizationAliases.checkoutUrl,
      authorizationAliases.paymentUrl,
      authorizationAliases.url
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
    const transactionReference = authorization.transactionReference || payment.transactionReference;
    return {
      transactionReference,
      reference: transactionReference,
      amount: Number(payment.amount),
      currency: payment.currency,
      accessCode: authorization.accessCode,
      provider,
      authorizationUrl,
      checkoutUrl: authorizationUrl,
      paymentUrl: authorizationUrl,
      url: authorizationUrl
    };
  }
  private transactionReference(gateway: string): string {
    return `KGO-${gateway.toUpperCase()}-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  private configuredProvider(): string {
    return this.optionalValue("PAYMENTS_PROVIDER") ?? this.optionalValue("PAYMENT_PROVIDER") ?? "mock";
  }

  private livePaymentsEnabled(): boolean {
    return this.optionalValue("PAYMENTS_LIVE_ENABLED")?.toLowerCase() === "true";
  }

  private squadCustomerCheckoutEnabled(): boolean {
    return this.flagValue("SQUAD_CUSTOMER_CHECKOUT_ENABLED", false);
  }

  private flutterwaveCustomerCheckoutEnabled(): boolean {
    return this.flagValue("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED", false);
  }

  private walletTopUpCustomerEnabled(): boolean {
    return (
      this.flagValue("WALLET_TOP_UP_ENABLED", false) &&
      !this.flagValue("WALLET_PAYMENTS_ENABLED", false) &&
      this.configuredProvider() === "flutterwave" &&
      this.flutterwaveCustomerCheckoutEnabled() &&
      this.providerRegistry.customerCheckoutProviders().includes("flutterwave")
    );
  }

  private mockReadiness(activeProvider: string, livePaymentsEnabled: boolean) {
    return {
      provider: "mock",
      status: "READY" as ReadinessStatus,
      activeByEnvironment: activeProvider === "mock",
      customerSelectableInStaging: !livePaymentsEnabled,
      readyForSandboxCheckout: true,
      readyForLiveCheckout: false,
      requirements: [],
      issues: [],
      launchStatus: "INTERNAL_OR_FALLBACK",
      launchNote: "Mock payment is a staging/testing fallback only and must be hidden for public live checkout.",
      recommendedActions: ["Keep mock payment available for staging rollback, but do not expose it in public live checkout."]
    };
  }

  private launchPaymentOptions() {
    return {
      cashOnDelivery: {
        enabled: this.flagValue("CASH_ON_DELIVERY_ENABLED", false),
        label: "Cash / Pay on Delivery",
        launchCities: ["Kano", "Abuja"],
        customerSelectable: this.flagValue("CASH_ON_DELIVERY_ENABLED", false),
        requiresReconciliation: true,
        adminReconciliationAvailable: true,
        captainCashCollectionConfirmationAvailable: true,
        vendorVisibilityAvailable: true,
        envFlag: "CASH_ON_DELIVERY_ENABLED",
        recommendedValue: "true",
        note: "Cash/POD orders stay CASH_PENDING until KariGO Operations manually reconciles collection."
      },
      flutterwaveCustomerCheckout: {
        enabled: this.flutterwaveCustomerCheckoutEnabled(),
        label: "Flutterwave customer checkout",
        customerSelectable: this.providerRegistry.customerCheckoutProviders().includes("flutterwave"),
        apiMode: this.flutterwaveApiMode(),
        apiModeLabel: this.flutterwaveApiMode() === "v3" ? "v3 Standard checkout" : "v4 OAuth/direct API",
        v3SecretConfigured: this.flutterwaveV3SecretConfigured(),
        v3StandardCheckoutReady: this.flutterwaveApiMode() === "v3" && this.flutterwaveV3SecretConfigured() && this.flutterwaveBaseUrlReady("v3"),
        v4CredentialsConfigured: this.flutterwaveV4CredentialsConfigured(),
        accessTokenAuthReady: this.flutterwaveV4CredentialsConfigured() && this.flutterwaveTokenUrlReady(),
        v4EndpointConfigured: this.flutterwaveApiMode() === "v4" && this.flutterwaveV4EndpointReady(),
        v4CheckoutPath: this.optionalValue("FLUTTERWAVE_V4_CHECKOUT_PATH") ?? "/orders",
        liveModeConfigured: this.optionalValue("FLUTTERWAVE_ENVIRONMENT")?.toLowerCase() === "live",
        webhookConfigured: this.flutterwaveWebhookConfigured(),
        callbackConfigured: this.flutterwaveCallbackConfigured(),
        envFlag: "FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED",
        recommendedValue: "true",
        note: "Flutterwave is KariGO's primary online customer checkout provider. Use v3 Standard checkout for hosted payment links; keep v4 OAuth/direct API fenced until its order/payment-method flow is separately approved. Backend verification/webhook processing must confirm payment before an order is marked paid."
      },
      squadCustomerCheckout: {
        enabled: this.squadCustomerCheckoutEnabled(),
        label: "Squad customer checkout",
        customerSelectable: this.squadCustomerCheckoutEnabled(),
        envFlag: "SQUAD_CUSTOMER_CHECKOUT_ENABLED",
        recommendedValue: "false",
        note: "Squad remains disabled/internal review for customer checkout after the Flutterwave switch."
      },
      wallet: {
        walletTopUpEnabled: this.walletTopUpCustomerEnabled(),
        walletTopUpConfiguredByEnv: this.flagValue("WALLET_TOP_UP_ENABLED", false),
        walletPaymentsEnabled: this.flagValue("WALLET_PAYMENTS_ENABLED", false),
        providerForTopUp: "Flutterwave",
        backendVerificationRequired: true,
        clientSideCreditDisabled: true,
        adminWalletVisibilityAvailable: true,
        minimumTopUpAmount: this.walletMinimumTopUpAmount(),
        envFlags: ["WALLET_TOP_UP_ENABLED", "WALLET_PAYMENTS_ENABLED"],
        recommendedValues: {
          WALLET_TOP_UP_ENABLED: "true when Flutterwave top-up is approved",
          WALLET_PAYMENTS_ENABLED: "false"
        },
        note: this.walletTopUpCustomerEnabled()
          ? "Wallet top-up is enabled through Flutterwave only. Customer wallet credit remains backend-verification/webhook controlled; wallet order payment remains disabled."
          : "Wallet top-up is disabled until WALLET_TOP_UP_ENABLED=true, PAYMENTS_PROVIDER=flutterwave and FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true are all configured. Wallet order payment remains disabled."
      }
    };
  }

  private utilityReadiness() {
    const provider = this.optionalValue("UTILITIES_PROVIDER")?.toLowerCase() ?? "mock";
    const accelerateEnabled = this.flagValue("ACCELERATE_ENABLED", false);
    const utilitiesEnabled = this.flagValue("UTILITIES_ENABLED", false);
    const testMode = this.flagValue("UTILITIES_TEST_MODE", true);
    const customerPurchaseEnabled = this.flagValue("UTILITIES_CUSTOMER_PURCHASE_ENABLED", false);
    const requirements: ProviderRequirement[] = [
      this.utilityFlagRequirement("UTILITIES_PROVIDER", provider === "accelerate", "Set to accelerate for approved Accelerate.ng provider readiness"),
      this.utilityFlagRequirement("ACCELERATE_ENABLED", accelerateEnabled, "Enable backend Accelerate readiness visibility after account approval"),
      this.utilityUrlRequirement("ACCELERATE_BASE_URL", "Accelerate.ng provider base URL configured in Render/secret manager"),
      this.utilitySecretRequirement("ACCELERATE_API_KEY", "Accelerate.ng API key configured in Render/secret manager"),
      this.utilityOptionalSecretRequirement("ACCELERATE_CLIENT_ID", "Accelerate.ng client ID if required by the approved account"),
      this.utilityOptionalSecretRequirement("ACCELERATE_CLIENT_SECRET", "Accelerate.ng client secret if required by the approved account"),
      this.utilityOptionalSecretRequirement("ACCELERATE_WEBHOOK_SECRET", "Accelerate.ng webhook secret if required for callbacks")
    ];
    const missingRequiredKeys = requirements
      .filter((requirement) => requirement.required && (!requirement.configured || requirement.issue))
      .map((requirement) => requirement.name);
    return {
      provider: provider === "accelerate" ? "accelerate" : provider,
      providerLabel: provider === "accelerate" ? "Accelerate.ng" : "Mock utility provider",
      accountStatus: accelerateEnabled ? "Approved" : "Not enabled",
      integrationStatus: provider === "accelerate" && accelerateEnabled
        ? "Readiness / controlled testing"
        : "Mock/test-mode only",
      enabled: utilitiesEnabled,
      testMode,
      customerPurchaseEnabled: utilitiesEnabled && customerPurchaseEnabled,
      customerPurchaseBlocked: !(utilitiesEnabled && customerPurchaseEnabled),
      liveCustomerPurchaseStatus: utilitiesEnabled && customerPurchaseEnabled ? "Enabled by environment" : "Disabled until separately approved",
      backendConnectivityTestAvailable: provider === "accelerate" && accelerateEnabled && missingRequiredKeys.length === 0,
      requiredEnv: requirements,
      missingRequiredKeys,
      notes: [
        "Accelerate.ng is approved as the future Bills & Utilities provider, but customer purchases remain disabled until separately approved.",
        "No Accelerate API keys, client secrets or webhook secrets are returned by this readiness response.",
        "Wallet-to-utility payment remains a future flow and is not active."
      ]
    };
  }

  private providerReadinessRecord(
    provider: PaymentProviderName,
    requirements: ProviderRequirement[],
    activeProvider: string,
    livePaymentsEnabled: boolean,
    customerSelectableSandboxProviders: CustomerTestPaymentProviderName[],
    liveMode = false
  ) {
    const launchProfile = this.providerLaunchProfile(provider, customerSelectableSandboxProviders.includes(provider as CustomerTestPaymentProviderName));
    const requiredIssues = requirements
      .filter((requirement) => requirement.required && (!requirement.configured || requirement.issue))
      .map((requirement) => requirement.issue ?? `missing ${requirement.name}`);
    const recommendedIssues = requirements
      .filter((requirement) => !requirement.required && requirement.issue)
      .map((requirement) => requirement.issue);
    const liveIssue = livePaymentsEnabled && !liveMode
      ? ["PAYMENTS_LIVE_ENABLED must be false for sandbox provider checkout"]
      : [];
    const issues = [...liveIssue, ...requiredIssues];
    const status: ReadinessStatus = issues.length ? "WAITING_FOR_CONFIGURATION" : "READY";

    return {
      provider,
      status,
      activeByEnvironment: activeProvider === provider,
      customerSelectableInStaging: customerSelectableSandboxProviders.some((item) => item === provider),
      launchStatus: launchProfile.status,
      launchNote: launchProfile.note,
      readyForSandboxCheckout: !liveMode && status === "READY",
      readyForLiveCheckout: liveMode && status === "READY",
      requirements,
      issues,
      recommendations: [
        launchProfile.recommendation,
        ...recommendedIssues,
        liveMode
          ? `Verify ${this.providerLabel(provider)} callback and webhook URLs in the provider dashboard before live launch approval.`
          : "Verify callback and webhook URLs in the provider dashboard before sandbox certification.",
        "Do not add provider credentials to source code, screenshots or Git-tracked documentation."
      ].filter(Boolean)
    };
  }

  private modeRequirement(name: string, allowed: string[], purpose?: string): ProviderRequirement {
    const value = this.optionalValue(name)?.toLowerCase();
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose: purpose ?? `Must be ${allowed.join(" or ")} for sandbox checkout`,
      issue: !value
        ? `missing ${name}`
        : allowed.includes(value)
          ? undefined
          : `${name} must be ${allowed.join(" or ")}`
    };
  }

  private secretRequirement(name: string, purpose: string, expectedPrefix?: string): ProviderRequirement {
    const value = this.optionalValue(name);
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose,
      issue: !value
        ? `missing ${name}`
        : expectedPrefix && !value.startsWith(expectedPrefix)
          ? `${name} does not match the expected sandbox key format`
          : undefined
    };
  }

  private optionalRequirement(name: string, purpose: string): ProviderRequirement {
    return {
      name,
      required: false,
      configured: Boolean(this.optionalValue(name)),
      purpose,
      issue: this.optionalValue(name) ? undefined : `${name} is not configured`
    };
  }

  private utilityFlagRequirement(name: string, configured: boolean, purpose: string): ProviderRequirement {
    return {
      name,
      required: true,
      configured,
      purpose,
      issue: configured ? undefined : `${name} is not configured for Accelerate readiness`
    };
  }

  private utilitySecretRequirement(name: string, purpose: string): ProviderRequirement {
    return {
      name,
      required: true,
      configured: Boolean(this.optionalValue(name)),
      purpose,
      issue: this.optionalValue(name) ? undefined : `missing ${name}`
    };
  }

  private utilityOptionalSecretRequirement(name: string, purpose: string): ProviderRequirement {
    return {
      name,
      required: false,
      configured: Boolean(this.optionalValue(name)),
      purpose,
      issue: undefined
    };
  }

  private utilityUrlRequirement(name: string, purpose: string): ProviderRequirement {
    const value = this.optionalValue(name);
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose,
      issue: !value
        ? `missing ${name}`
        : !value.startsWith("https://")
          ? `${name} must use HTTPS`
          : undefined
    };
  }

  private urlRequirement(
    name: string,
    purpose: string,
    forbiddenHost?: string,
    requiredSubstring?: string
  ): ProviderRequirement {
    const value = this.optionalValue(name);
    return {
      name,
      required: false,
      configured: Boolean(value),
      purpose,
      issue: !value
        ? undefined
        : !value.startsWith("https://")
          ? `${name} must use HTTPS`
          : forbiddenHost && value.includes(forbiddenHost) && (!requiredSubstring || !value.includes(requiredSubstring))
            ? `${name} points at a live provider host instead of sandbox`
            : undefined
    };
  }

  private requiredUrlRequirement(
    name: string,
    purpose: string,
    options?: { rejectSandbox?: boolean }
  ): ProviderRequirement {
    const value = this.optionalValue(name);
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose,
      issue: !value
        ? `missing ${name}`
        : !value.startsWith("https://")
          ? `${name} must use HTTPS`
          : options?.rejectSandbox && value.toLowerCase().includes("sandbox")
            ? `${name} must use a live provider URL`
            : undefined
    };
  }

  private flutterwaveRequiredBaseUrlRequirement(apiMode: "v3" | "v4", purpose: string): ProviderRequirement {
    const defaultValue = apiMode === "v3" ? "https://api.flutterwave.com/v3" : "https://f4bexperience.flutterwave.com";
    const value = this.optionalValue("FLUTTERWAVE_BASE_URL") ?? defaultValue;
    const lowerValue = value.toLowerCase();
    const issue = !value
      ? "missing FLUTTERWAVE_BASE_URL"
      : !value.startsWith("https://")
        ? "FLUTTERWAVE_BASE_URL must use HTTPS"
        : lowerValue.includes("sandbox")
          ? "FLUTTERWAVE_BASE_URL must use a live provider URL"
          : apiMode === "v3" && lowerValue.includes("f4bexperience.flutterwave.com")
            ? "FLUTTERWAVE_BASE_URL must use the v3 Standard checkout API host for FLUTTERWAVE_API_MODE=v3"
            : apiMode === "v4" && lowerValue.includes("api.flutterwave.com/v3")
              ? "FLUTTERWAVE_BASE_URL must use a v4 Flutterwave API host for FLUTTERWAVE_API_MODE=v4"
              : undefined;
    return {
      name: "FLUTTERWAVE_BASE_URL",
      required: true,
      configured: Boolean(value),
      purpose,
      issue
    };
  }

  private flutterwaveV4PathRequirement(): ProviderRequirement {
    const value = this.optionalValue("FLUTTERWAVE_V4_CHECKOUT_PATH") ?? "/orders";
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return {
      name: "FLUTTERWAVE_V4_CHECKOUT_PATH",
      required: true,
      configured: Boolean(value),
      purpose: "Flutterwave v4 direct API endpoint; must not use v3 /payments",
      issue: normalized.toLowerCase() === "/payments"
        ? "FLUTTERWAVE_V4_CHECKOUT_PATH cannot be /payments"
        : undefined
    };
  }

  private requiredFlagRequirement(name: string, purpose: string): ProviderRequirement {
    const value = this.optionalValue(name)?.toLowerCase();
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose,
      issue: value === "true" ? undefined : `${name} must be true`
    };
  }

  private eitherSecretRequirement(names: string[], purpose: string): ProviderRequirement {
    const configuredName = names.find((name) => Boolean(this.optionalValue(name)));
    return {
      name: names.join(" or "),
      required: true,
      configured: Boolean(configuredName),
      purpose,
      issue: configuredName ? undefined : `missing ${names.join(" or ")}`
    };
  }

  private eitherRequiredUrlRequirement(names: string[], purpose: string): ProviderRequirement {
    const configuredName = names.find((name) => Boolean(this.optionalValue(name)));
    const value = configuredName ? this.optionalValue(configuredName) : undefined;
    return {
      name: names.join(" or "),
      required: true,
      configured: Boolean(configuredName),
      purpose,
      issue: !configuredName || !value
        ? `missing ${names.join(" or ")}`
        : !value.startsWith("https://")
          ? `${configuredName} must use HTTPS`
          : undefined
    };
  }

  private flutterwaveReadinessRequirements(liveMode: boolean): ProviderRequirement[] {
    const apiMode = this.flutterwaveApiMode();
    if (liveMode) {
      const baseRequirements = [
        this.modeRequirement("FLUTTERWAVE_API_MODE", ["v3", "v4"], "Must be v3 for Standard hosted checkout or v4 for approved direct API flow"),
        this.modeRequirement("FLUTTERWAVE_ENVIRONMENT", ["live"], "Must be live for approved Flutterwave launch checkout"),
        this.optionalRequirement("FLUTTERWAVE_PUBLIC_KEY", "Client-safe public key if a future client-side flow requires it"),
        this.eitherRequiredUrlRequirement(["FLUTTERWAVE_REDIRECT_URL", "FLUTTERWAVE_CALLBACK_URL"], "Public HTTPS redirect/callback URL configured in Flutterwave"),
        this.eitherSecretRequirement(["FLUTTERWAVE_SECRET_HASH", "FLUTTERWAVE_WEBHOOK_SECRET"], "Flutterwave webhook secret hash"),
        this.requiredFlagRequirement("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED", "Enable Flutterwave as customer-selectable checkout")
      ];
      if (apiMode === "v3") {
        return [
          ...baseRequirements,
          this.secretRequirement("FLUTTERWAVE_SECRET_KEY", "Flutterwave v3 Standard checkout server-side secret key"),
          this.flutterwaveRequiredBaseUrlRequirement(apiMode, "Flutterwave v3 Standard checkout API base URL")
        ];
      }
      return [
        ...baseRequirements,
        this.secretRequirement("FLUTTERWAVE_CLIENT_ID", "Flutterwave v4 OAuth client ID from the Flutterwave dashboard"),
        this.secretRequirement("FLUTTERWAVE_CLIENT_SECRET", "Flutterwave v4 OAuth client secret from the Flutterwave dashboard"),
        this.flutterwaveRequiredBaseUrlRequirement(apiMode, "Flutterwave v4 API base URL"),
        this.urlRequirement("FLUTTERWAVE_TOKEN_URL", "Flutterwave v4 OAuth token endpoint; defaults to the official Flutterwave token endpoint when omitted"),
        this.flutterwaveV4PathRequirement()
      ];
    }
    return [
      this.optionalRequirement("FLUTTERWAVE_API_MODE", "Set v3 for Standard hosted checkout or v4 for OAuth/direct API"),
      this.modeRequirement("FLUTTERWAVE_ENVIRONMENT", ["live"], "Flutterwave is live-only for launch; keep unset until live credentials are approved"),
      this.optionalRequirement("FLUTTERWAVE_SECRET_KEY", "Flutterwave v3 Standard checkout secret key; configure only in Render/secret manager"),
      this.optionalRequirement("FLUTTERWAVE_CLIENT_ID", "Flutterwave v4 OAuth client ID; configure only in Render/secret manager when v4 is selected"),
      this.optionalRequirement("FLUTTERWAVE_CLIENT_SECRET", "Flutterwave v4 OAuth client secret; configure only in Render/secret manager when v4 is selected"),
      this.optionalRequirement("FLUTTERWAVE_PUBLIC_KEY", "Client-safe public key if a future client-side flow requires it"),
      this.urlRequirement("FLUTTERWAVE_BASE_URL", "Flutterwave API base URL; defaults by FLUTTERWAVE_API_MODE when omitted"),
      this.optionalRequirement("FLUTTERWAVE_CHECKOUT_PATH", "v3 Standard checkout path; defaults to /payments"),
      this.optionalRequirement("FLUTTERWAVE_V4_CHECKOUT_PATH", "v4 direct API path; defaults to /orders and must not be /payments"),
      this.urlRequirement("FLUTTERWAVE_TOKEN_URL", "Flutterwave v4 OAuth token endpoint; defaults to the official Flutterwave token endpoint when omitted"),
      this.optionalRequirement("FLUTTERWAVE_REDIRECT_URL", "Flutterwave checkout redirect URL configured in the provider dashboard"),
      this.optionalRequirement("FLUTTERWAVE_CALLBACK_URL", "Legacy alias for Flutterwave checkout redirect URL"),
      this.optionalRequirement("FLUTTERWAVE_SECRET_HASH", "Webhook secret hash; do not store in source control"),
      this.optionalRequirement("FLUTTERWAVE_WEBHOOK_SECRET", "Webhook secret alias; do not store in source control")
    ];
  }

  private squadReadinessRequirements(liveMode: boolean): ProviderRequirement[] {
    if (liveMode) {
      return [
        this.modeRequirement("SQUAD_MODE", ["live"], "Must be live for approved Squad launch checkout"),
        this.secretRequirement("SQUAD_SECRET_KEY", "Squad live server-side secret key"),
        this.optionalRequirement("SQUAD_PUBLIC_KEY", "Client-safe public key if Squad dashboard or future frontend flow requires it"),
        this.requiredUrlRequirement("SQUAD_BASE_URL", "Squad live API base URL from the approved Squad dashboard", { rejectSandbox: true }),
        this.requiredUrlRequirement("SQUAD_CALLBACK_URL", "Public HTTPS callback/redirect URL configured in the Squad dashboard"),
        this.secretRequirement("SQUAD_WEBHOOK_SECRET", "Squad live webhook signing secret"),
        this.requiredFlagRequirement("SQUAD_LIVE_ACTIVATION_APPROVED", "Finance/management approval record for live Squad checkout")
      ];
    }
    return [
      this.modeRequirement("SQUAD_MODE", ["test", "sandbox"], "Must be test or sandbox for Squad sandbox checkout"),
      this.secretRequirement("SQUAD_SECRET_KEY", "Squad sandbox secret key", "sandbox_sk_"),
      this.optionalRequirement("SQUAD_PUBLIC_KEY", "Client-safe public key; not used by the current hosted-checkout backend flow"),
      this.urlRequirement("SQUAD_BASE_URL", "Squad sandbox API base URL; defaults to sandbox when omitted", "api-d.squadco.com", "sandbox"),
      this.optionalRequirement("SQUAD_CALLBACK_URL", "Squad hosted checkout callback URL configured in the provider dashboard"),
      this.optionalRequirement("SQUAD_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the sandbox secret if omitted")
    ];
  }

  private flutterwaveLiveRequested(livePaymentsEnabled: boolean, activeProvider: string): boolean {
    return livePaymentsEnabled || activeProvider === "flutterwave" || this.optionalValue("FLUTTERWAVE_ENVIRONMENT")?.toLowerCase() === "live";
  }

  private squadLiveRequested(activeProvider: string): boolean {
    return activeProvider === "squad" || this.optionalValue("SQUAD_MODE")?.toLowerCase() === "live";
  }

  private flutterwaveLiveActivationReadiness(activeProvider: string) {
    const livePaymentsEnabled = this.livePaymentsEnabled();
    const blockers = [
      livePaymentsEnabled ? undefined : "PAYMENTS_LIVE_ENABLED must be true",
      activeProvider === "flutterwave" ? undefined : "PAYMENTS_PROVIDER must be flutterwave",
      ...this.flutterwaveReadinessRequirements(true)
        .filter((requirement) => requirement.required && (!requirement.configured || requirement.issue))
        .map((requirement) => requirement.issue ?? `missing ${requirement.name}`),
      livePaymentsEnabled && this.providerRegistry.customerCheckoutProviders().includes("mock")
        ? "Mock payment must be hidden from public live checkout"
        : undefined
    ].filter(Boolean) as string[];

    return {
      supportedByCurrentCode: true,
      status: blockers.length ? "WAITING_FOR_CONFIGURATION" : "READY",
      blockers
    };
  }

  private flutterwaveV4CredentialsConfigured(): boolean {
    return Boolean(this.optionalValue("FLUTTERWAVE_CLIENT_ID") && this.optionalValue("FLUTTERWAVE_CLIENT_SECRET"));
  }

  private flutterwaveV3SecretConfigured(): boolean {
    return Boolean(this.optionalValue("FLUTTERWAVE_SECRET_KEY"));
  }

  private flutterwaveApiMode(): "v3" | "v4" {
    const value = this.optionalValue("FLUTTERWAVE_API_MODE")?.toLowerCase();
    return value === "v4" ? "v4" : "v3";
  }

  private flutterwaveBaseUrlReady(apiMode: "v3" | "v4"): boolean {
    const defaultValue = apiMode === "v3" ? "https://api.flutterwave.com/v3" : "https://f4bexperience.flutterwave.com";
    const value = this.optionalValue("FLUTTERWAVE_BASE_URL") ?? defaultValue;
    const lowerValue = value.toLowerCase();
    if (!value.startsWith("https://") || lowerValue.includes("sandbox")) return false;
    if (apiMode === "v3" && lowerValue.includes("f4bexperience.flutterwave.com")) return false;
    if (apiMode === "v4" && lowerValue.includes("api.flutterwave.com/v3")) return false;
    return true;
  }

  private flutterwaveV4EndpointReady(): boolean {
    const value = this.optionalValue("FLUTTERWAVE_V4_CHECKOUT_PATH") ?? "/orders";
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return normalized.toLowerCase() !== "/payments";
  }

  private flutterwaveTokenUrlReady(): boolean {
    const tokenUrl = this.optionalValue("FLUTTERWAVE_TOKEN_URL");
    return !tokenUrl || tokenUrl.startsWith("https://");
  }

  private flutterwaveCallbackConfigured(): boolean {
    const redirectUrl = this.optionalValue("FLUTTERWAVE_REDIRECT_URL")
      ?? this.optionalValue("FLUTTERWAVE_CALLBACK_URL");
    return Boolean(redirectUrl?.startsWith("https://"));
  }

  private flutterwaveWebhookConfigured(): boolean {
    return Boolean(this.optionalValue("FLUTTERWAVE_SECRET_HASH") ?? this.optionalValue("FLUTTERWAVE_WEBHOOK_SECRET"));
  }

  private optionalValue(name: string): string | undefined {
    const value = this.config.get<unknown>(name);
    if (typeof value === "string") {
      return value.trim() || undefined;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      return String(value);
    }
    return undefined;
  }

  private flagValue(name: string, fallback: boolean): boolean {
    const value = this.optionalValue(name);
    if (!value) return fallback;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  private walletMinimumTopUpAmount(): number {
    const value = Number(this.optionalValue("WALLET_MIN_TOP_UP_AMOUNT") ?? 100);
    return Number.isFinite(value) && value > 0 ? value : 100;
  }

  private walletTopUpReturnUrl(transactionReference: string): string {
    const configuredDirectReturn = this.optionalValue("CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL");
    const appReturnBase = configuredDirectReturn
      ?? this.customerWalletDeepLinkBase(this.optionalValue("CUSTOMER_APP_DEEP_LINK_BASE"));
    const appReturnUrl = this.withWalletTopUpReference(
      appReturnBase,
      transactionReference
    );
    if (configuredDirectReturn && (this.approvedCustomerAppReturnUrl(appReturnUrl) || appReturnUrl.startsWith("https://"))) {
      return appReturnUrl;
    }

    const webFallbackUrl = this.withWalletTopUpReference(
      this.optionalValue("CUSTOMER_WEB_PAYMENT_FALLBACK_URL")
        ?? "https://www.karigo.com.ng/payment/flutterwave/return",
      transactionReference
    );
    try {
      const parsed = new URL(webFallbackUrl);
      parsed.searchParams.set("appReturnUrl", appReturnUrl);
      parsed.searchParams.set("purpose", "wallet_top_up");
      return parsed.toString();
    } catch {
      return "https://www.karigo.com.ng/payment/flutterwave/return";
    }
  }

  private customerWalletDeepLinkBase(configuredBase?: string): string {
    const base = configuredBase?.trim() || "karigo-customer://";
    if (base.includes("/profile/wallet")) return base;
    const schemeOnly = /^([a-z][a-z0-9+.-]*):\/{0,3}$/i.exec(base);
    if (schemeOnly) return `${schemeOnly[1]}:///profile/wallet`;
    return `${base.replace(/\/+$/, "")}/profile/wallet`;
  }

  private withWalletTopUpReference(baseUrl: string, transactionReference: string): string {
    try {
      const parsed = new URL(baseUrl);
      parsed.searchParams.set("topUpReference", transactionReference);
      parsed.searchParams.set("reference", transactionReference);
      parsed.searchParams.set("verifyWalletTopUp", "1");
      return parsed.toString();
    } catch {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}topUpReference=${encodeURIComponent(transactionReference)}&reference=${encodeURIComponent(transactionReference)}&verifyWalletTopUp=1`;
    }
  }

  private approvedCustomerAppReturnUrl(value: string): boolean {
    return [
      "karigo://",
      "karigo-customer://",
      "karigo-customer-staging://"
    ].some((prefix) => value.startsWith(prefix));
  }

  private providerLaunchProfile(provider: PaymentProviderName, customerSelectable: boolean) {
    switch (provider) {
      case "flutterwave":
        return customerSelectable
          ? {
              status: "PRIMARY_LAUNCH_PROVIDER",
              note: "Flutterwave is the primary online launch checkout provider and is customer-selectable when configured.",
              recommendation: "Complete low-value live checkout, redirect and webhook verification before wider public rollout."
            }
          : {
              status: "PRIMARY_LAUNCH_PROVIDER",
              note: "Flutterwave is the primary online launch checkout provider. Customer visibility is gated by FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED and readiness checks.",
              recommendation: "Set Flutterwave credentials only in Render/secret manager and keep Pay on Delivery available as the launch fallback."
            };
      case "monnify":
        return {
          status: "PENDING_APPROVAL_SECONDARY_PROVIDER",
          note: "Monnify provider approval is pending; keep it as a future secondary provider after approval.",
          recommendation: "Do not expose Monnify for public live checkout until provider approval and live credentials are recorded."
        };
      case "paystack":
        return {
          status: "PENDING_APPROVAL_SECONDARY_PROVIDER",
          note: "Paystack provider approval is pending; keep it as a future secondary provider after approval.",
          recommendation: "Do not expose Paystack for public live checkout until provider approval and live credentials are recorded."
        };
      case "squad":
        return {
          status: "DEFERRED_FOR_LAUNCH",
          note: "Squad by GTBank is disabled/internal review for customer checkout after live routing issues.",
          recommendation: "Keep SQUAD_CUSTOMER_CHECKOUT_ENABLED=false until a separate Squad reopening task verifies the external checkout flow."
        };
      default:
        return {
          status: "INTERNAL_OR_FALLBACK",
          note: "Provider is not part of the Monnify/Paystack launch priority.",
          recommendation: undefined
        };
    }
  }

  private async recordInitializationFailure(
    paymentId: string,
    orderId: string,
    orderNumber: string,
    userId: string,
    providerName: string,
    error: unknown
  ) {
    try {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
    } catch (updateError) {
      this.logger.warn(
        `Payment initialization failure status update failed provider=${providerName} paymentId=${paymentId} reason=${this.safeErrorMessage(updateError)}`
      );
    }

    try {
      await this.notifications.createNotification({
        userId,
        title: "Payment failed",
        message: `Payment initialization for order ${orderNumber} failed.`,
        type: NotificationType.PAYMENT_FAILED,
        entityType: "Order",
        entityId: orderId
      });
    } catch (notificationError) {
      this.logger.warn(
        `Payment initialization failure notification skipped provider=${providerName} paymentId=${paymentId} reason=${this.safeErrorMessage(notificationError)}`
      );
    }

    this.logger.warn(
      `Payment initialization failed provider=${providerName} paymentId=${paymentId} ${this.safeInitializationDiagnostic(providerName, error)}`
    );
  }

  private safeInitializationException(providerName: string, _error: unknown): HttpException {
    if (
      providerName === "flutterwave"
      && _error instanceof PaymentProviderInitializationException
      && ["FLUTTERWAVE_CHECKOUT_LINK_MISSING", "FLUTTERWAVE_AUTH_FAILED", "FLUTTERWAVE_ENDPOINT_NOT_FOUND"].includes(_error.diagnostic.code ?? "")
    ) {
      const message = _error.diagnostic.code === "FLUTTERWAVE_AUTH_FAILED"
        ? "Flutterwave authentication failed."
        : _error.diagnostic.code === "FLUTTERWAVE_ENDPOINT_NOT_FOUND"
          ? "Flutterwave checkout endpoint is not configured for this API mode."
          : "Flutterwave checkout link was not returned.";
      return new BadGatewayException({
        message,
        error_code: _error.diagnostic.code,
        details: {
          safeDiagnostics: _error.diagnostic.safeDiagnostics ?? {}
        }
      });
    }
    if (this.livePaymentsEnabled()) {
      return new BadGatewayException(
        `${this.providerLabel(providerName)} could not be started safely. Please retry payment or contact KariGO support.`
      );
    }
    return new BadGatewayException(
      `${this.providerLabel(providerName)} could not be started. Please use mock payment or retry the sandbox provider later.`
    );
  }

  private providerLabel(providerName: string): string {
    switch (providerName) {
      case "flutterwave": return "Flutterwave";
      case "paystack": return "Paystack Test Mode";
      case "monnify": return "Monnify Sandbox";
      case "squad": return this.livePaymentsEnabled() ? "Squad by GTBank" : "Squad Sandbox";
      case "mock": return "Mock payment";
      default: return "Selected payment provider";
    }
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private safeInitializationDiagnostic(providerName: string, error: unknown): string {
    const diagnostic = paymentInitializationDiagnostic(providerName, error);
    return `stage=${diagnostic.stage} status=${diagnostic.httpStatusCode ?? "n/a"} reason=${diagnostic.providerMessage ?? diagnostic.message}`;
  }

  private providerMode(providerName: PaymentProvider["name"]): string {
    switch (providerName) {
      case "flutterwave": return this.optionalValue("FLUTTERWAVE_ENVIRONMENT") ?? "not_configured";
      case "paystack": return this.optionalValue("PAYSTACK_MODE") ?? "not_configured";
      case "monnify": return this.optionalValue("MONNIFY_MODE") ?? "not_configured";
      case "squad": return this.optionalValue("SQUAD_MODE") ?? "not_configured";
      case "mock": return "mock";
      default: return "unknown";
    }
  }

  private safeReference(reference: string): string {
    return reference
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "payment";
  }

  private assertProviderEvidence(
    expectedAmount: Prisma.Decimal,
    expectedCurrency: string,
    expectedReference: string,
    evidence: { transactionReference: string; amountMinor?: number; currency?: string }
  ): void {
    if (evidence.transactionReference !== expectedReference) {
      throw new BadRequestException("Provider transaction reference does not match the payment");
    }
    if (evidence.currency && evidence.currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw new BadRequestException("Provider payment currency does not match the payment");
    }
    if (evidence.amountMinor !== undefined) {
      const expectedMinor = Number(expectedAmount.mul(100).toFixed(0));
      if (evidence.amountMinor !== expectedMinor) {
        throw new BadRequestException("Provider payment amount does not match the order total");
      }
    }
  }
}
