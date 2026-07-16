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
  PaymentStatus,
  Prisma,
  ServiceCategory
} from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { SandboxInitializationTestProvider } from "./dto/test-payment-provider.dto";
import { CUSTOMER_TEST_PAYMENT_PROVIDERS, PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { PaymentProvider, PaymentProviderName, PaymentWebhookContext } from "./providers/payment-provider.interface";
import { paymentInitializationDiagnostic } from "./providers/payment-provider-diagnostics";
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
    if (order.orderStatus !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException("Order is not awaiting payment");
    }
    if (!order.totalAmount.equals(new Prisma.Decimal(dto.amount))) {
      throw new BadRequestException("Payment amount does not match the order total");
    }

    const provider = dto.paymentProvider
      ? this.providerRegistry.customerTestProvider(dto.paymentProvider)
      : this.providerRegistry.active();
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
    });

    return { payment: initializedPayment, authorization };
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

  providerReadiness() {
    const activeProvider = this.configuredProvider();
    const livePaymentsEnabled = this.livePaymentsEnabled();
    const providers = [
      this.mockReadiness(activeProvider),
      this.providerReadinessRecord("paystack", [
        this.modeRequirement("PAYSTACK_MODE", ["test"]),
        this.secretRequirement("PAYSTACK_SECRET_KEY", "Paystack server-side test secret key", "sk_test_"),
        this.optionalRequirement("PAYSTACK_PUBLIC_KEY", "Client-safe public key; not used by the current hosted-checkout backend flow"),
        this.urlRequirement("PAYSTACK_BASE_URL", "Paystack API base URL; defaults to the Paystack API host when omitted"),
        this.optionalRequirement("PAYSTACK_CALLBACK_URL", "Hosted checkout callback URL configured in the provider dashboard"),
        this.optionalRequirement("PAYSTACK_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the test secret if omitted")
      ], activeProvider, livePaymentsEnabled),
      this.providerReadinessRecord("monnify", [
        this.modeRequirement("MONNIFY_MODE", ["test", "sandbox"]),
        this.secretRequirement("MONNIFY_API_KEY", "Monnify sandbox API key"),
        this.secretRequirement("MONNIFY_SECRET_KEY", "Monnify sandbox secret key"),
        this.secretRequirement("MONNIFY_CONTRACT_CODE", "Monnify sandbox contract code"),
        this.urlRequirement("MONNIFY_BASE_URL", "Monnify sandbox API base URL; defaults to sandbox when omitted", "api.monnify.com"),
        this.optionalRequirement("MONNIFY_CALLBACK_URL", "Monnify checkout redirect URL configured in the provider dashboard"),
        this.optionalRequirement("MONNIFY_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the sandbox secret if omitted")
      ], activeProvider, livePaymentsEnabled),
      this.providerReadinessRecord("squad", [
        this.modeRequirement("SQUAD_MODE", ["test", "sandbox"]),
        this.secretRequirement("SQUAD_SECRET_KEY", "Squad sandbox secret key", "sandbox_sk_"),
        this.optionalRequirement("SQUAD_PUBLIC_KEY", "Client-safe public key; not used by the current hosted-checkout backend flow"),
        this.urlRequirement("SQUAD_BASE_URL", "Squad sandbox API base URL; defaults to sandbox when omitted", "api-d.squadco.com", "sandbox"),
        this.optionalRequirement("SQUAD_CALLBACK_URL", "Squad hosted checkout callback URL configured in the provider dashboard"),
        this.optionalRequirement("SQUAD_WEBHOOK_SECRET", "Webhook signature secret; provider falls back to the sandbox secret if omitted")
      ], activeProvider, livePaymentsEnabled)
    ];

    return {
      activeProvider,
      legacyActiveProvider: this.optionalValue("PAYMENT_PROVIDER") ? "configured" : "not_configured",
      paymentsLiveEnabled: livePaymentsEnabled,
      customerSelectableSandboxProviders: CUSTOMER_TEST_PAYMENT_PROVIDERS,
      providerEnabledFlags: {
        PAYMENTS_PROVIDER: this.optionalValue("PAYMENTS_PROVIDER") ? "configured" : "default_or_unset",
        PAYMENT_PROVIDER: this.optionalValue("PAYMENT_PROVIDER") ? "configured" : "default_or_unset",
        PAYMENTS_LIVE_ENABLED: livePaymentsEnabled ? "true" : "false_or_unset"
      },
      webhookRoutes: {
        paystack: "/api/v1/payments/webhook/paystack",
        monnify: "/api/v1/payments/webhook/monnify",
        squad: "/api/v1/payments/webhook/squad"
      },
      providers,
      liveActivation: {
        supportedByCurrentCode: false,
        status: "BLOCKED",
        blockers: [
          "Current Paystack, Monnify and Squad adapters are sandbox/test guarded.",
          "Live provider activation requires a separate engineering and finance approval gate.",
          "Production credentials must be stored only in the production secret manager."
        ]
      }
    };
  }

  async testProviderInitialization(providerName: SandboxInitializationTestProvider) {
    const provider = this.providerRegistry.customerTestProvider(providerName);
    const transactionReference = this.transactionReference(`${provider.name}-test`);
    const timestamp = new Date().toISOString();
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

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING }
      });
      const shouldMoveToRefundRequested = payment.order.orderStatus !== OrderStatus.REFUND_REQUESTED;
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.REFUND_PENDING,
          ...(shouldMoveToRefundRequested
            ? {
                orderStatus: OrderStatus.REFUND_REQUESTED,
                statusHistory: {
                  create: {
                    previousStatus: payment.order.orderStatus,
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

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUNDED }
      });
      if (payment.order.orderStatus !== OrderStatus.REFUNDED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            orderStatus: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
            statusHistory: {
              create: {
                previousStatus: payment.order.orderStatus,
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

  private transactionReference(gateway: string): string {
    return `KGO-${gateway.toUpperCase()}-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  private configuredProvider(): string {
    return this.optionalValue("PAYMENTS_PROVIDER") ?? this.optionalValue("PAYMENT_PROVIDER") ?? "mock";
  }

  private livePaymentsEnabled(): boolean {
    return this.optionalValue("PAYMENTS_LIVE_ENABLED")?.toLowerCase() === "true";
  }

  private mockReadiness(activeProvider: string) {
    return {
      provider: "mock",
      status: "READY" as ReadinessStatus,
      activeByEnvironment: activeProvider === "mock",
      customerSelectableInStaging: true,
      readyForSandboxCheckout: true,
      readyForLiveCheckout: false,
      requirements: [],
      issues: [],
      recommendedActions: ["Keep mock payment available as the rollback provider."]
    };
  }

  private providerReadinessRecord(
    provider: PaymentProviderName,
    requirements: ProviderRequirement[],
    activeProvider: string,
    livePaymentsEnabled: boolean
  ) {
    const requiredIssues = requirements
      .filter((requirement) => requirement.required && (!requirement.configured || requirement.issue))
      .map((requirement) => requirement.issue ?? `missing ${requirement.name}`);
    const recommendedIssues = requirements
      .filter((requirement) => !requirement.required && requirement.issue)
      .map((requirement) => requirement.issue);
    const liveIssue = livePaymentsEnabled
      ? ["PAYMENTS_LIVE_ENABLED must be false for sandbox provider checkout"]
      : [];
    const issues = [...liveIssue, ...requiredIssues];
    const status: ReadinessStatus = issues.length ? "WAITING_FOR_CONFIGURATION" : "READY";

    return {
      provider,
      status,
      activeByEnvironment: activeProvider === provider,
      customerSelectableInStaging: CUSTOMER_TEST_PAYMENT_PROVIDERS.some((item) => item === provider),
      readyForSandboxCheckout: status === "READY",
      readyForLiveCheckout: false,
      requirements,
      issues,
      recommendations: [
        ...recommendedIssues,
        "Verify callback and webhook URLs in the provider dashboard before sandbox certification.",
        "Do not add provider credentials to source code, screenshots or Git-tracked documentation."
      ].filter(Boolean)
    };
  }

  private modeRequirement(name: string, allowed: string[]): ProviderRequirement {
    const value = this.optionalValue(name)?.toLowerCase();
    return {
      name,
      required: true,
      configured: Boolean(value),
      purpose: `Must be ${allowed.join(" or ")} for sandbox checkout`,
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
    return new BadGatewayException(
      `${this.providerLabel(providerName)} could not be started. Please use mock payment or retry the sandbox provider later.`
    );
  }

  private providerLabel(providerName: string): string {
    switch (providerName) {
      case "paystack": return "Paystack Test Mode";
      case "monnify": return "Monnify Sandbox";
      case "squad": return "Squad Sandbox";
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
