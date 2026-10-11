import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma,
  UtilityServiceType,
  UtilityTransactionStatus,
  WalletLedgerDirection,
  WalletLedgerEntryStatus,
  WalletLedgerEntryType,
  WalletStatus
} from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUtilityTransactionDto, UtilityQuoteDto } from "./dto/customer-utility.dto";
import { ListUtilityTransactionsQueryDto } from "./dto/list-utility-transactions-query.dto";
import { UtilityProductsQueryDto, UtilityProvidersQueryDto } from "./dto/utility-catalogue-query.dto";
import { UpdateUtilityTransactionStatusDto } from "./dto/update-utility-status.dto";
import { AccelerateConnectivityStatus, AccelerateUtilityProvider } from "./providers/accelerate-utility.provider";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
import { PaybetaUtilityProvider } from "./providers/paybeta-utility.provider";
import { UtilityProviderClient, UtilityPurchaseResult, UtilityQuoteResult } from "./providers/utility-provider.interface";

const DEFAULT_AMOUNT_BOUNDARIES: Record<UtilityServiceType, { min: number; max: number }> = {
  AIRTIME: { min: 10000, max: 10000000 },
  DATA: { min: 10000, max: 10000000 },
  ELECTRICITY: { min: 50000, max: 50000000 },
  CABLE_TV: { min: 50000, max: 100000000 }
};

const TERMINAL_STATUSES: UtilityTransactionStatus[] = [
  UtilityTransactionStatus.SUCCESSFUL,
  UtilityTransactionStatus.FAILED,
  UtilityTransactionStatus.CANCELLED
];
const CUSTOMER_CANCELLABLE_STATUSES: UtilityTransactionStatus[] = [
  UtilityTransactionStatus.DRAFT,
  UtilityTransactionStatus.PENDING
];
const UTILITY_WALLET_SOURCE_TYPE = "UTILITY_TRANSACTION";
const UTILITY_WALLET_REVERSAL_SOURCE_TYPE = "UTILITY_TRANSACTION_REVERSAL";
const ACCELERATE_IP_DENIAL_STATUSES = [
  "ACCELERATE_ACCESS_DENIED_IP_ALLOWLIST",
  "ACCELERATE_STATUS_IP_ALLOWLIST_REQUIRED"
];
const ACCELERATE_IP_DENIAL_NOTE = "Accelerate rejected a protected production request from the current backend egress IP.";

@Injectable()
export class UtilitiesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UtilitiesService.name);
  private reconciliationTimer?: NodeJS.Timeout;
  private reconciling = false;

  onModuleInit() {
    this.reconciliationTimer = setInterval(() => void this.reconcilePending(), 30_000);
    this.reconciliationTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  async reconcilePending() {
    if (this.reconciling || !this.paybetaProvider?.isConfigured()) return;
    this.reconciling = true;
    try {
      const pending = await this.prisma.utilityTransaction.findMany({
        where: {
          status: UtilityTransactionStatus.PROCESSING,
          providerStatus: { startsWith: "PAYBETA_" },
          // Older unresolved requests require an owner-scoped receipt/admin recovery;
          // deployment must not sweep historical financial incidents.
          createdAt: { gte: new Date(Date.now() - 90 * 60_000) },
          updatedAt: { lte: new Date(Date.now() - 30_000) }
        },
        include: this.customerInclude(),
        orderBy: { updatedAt: "asc" },
        take: 20
      });
      for (const transaction of pending) await this.reconcileTransaction(transaction);
    } catch {
      // Provider payloads, tokens and credentials must never enter logs.
      this.logger.warn("Utility status reconciliation deferred; no purchase was retried.");
    } finally {
      this.reconciling = false;
    }
  }

  private async reconcileTransaction(transaction: Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["customerInclude"]> }>) {
    const metadata = this.jsonObject(transaction.metadata);
    if (transaction.status !== UtilityTransactionStatus.PROCESSING ||
        this.transactionProviderMode(transaction.metadata) !== "paybeta" ||
        metadata.walletDebitStatus !== "POSTED" || metadata.compensationConflict === true ||
        metadata.manualReconciliationRequired === true) return transaction;
    const attempt = Number(metadata.reconciliationAttempts ?? 0);
    const due = metadata.reconciliationNextAt ? Date.parse(String(metadata.reconciliationNextAt)) : transaction.updatedAt.getTime() + 30_000;
    if (attempt >= 6 || due > Date.now()) return transaction;
    const claimTime = new Date();
    const claimedMetadata = this.mergeMetadata(transaction.metadata, {
      reconciliationAttempts: attempt + 1,
      reconciliationNextAt: new Date(Date.now() + [60_000, 120_000, 300_000, 600_000, 1800_000, 3600_000][attempt]).toISOString()
    });
    // Durable optimistic claim prevents concurrent workers/receipt refreshes querying the same attempt.
    const claim = await this.prisma.utilityTransaction.updateMany({
      where: { id: transaction.id, status: UtilityTransactionStatus.PROCESSING, updatedAt: transaction.updatedAt },
      data: { metadata: claimedMetadata, updatedAt: claimTime }
    });
    if (claim.count !== 1) return transaction;
    const result = await this.paybetaProvider!.checkStatus(transaction.reference, transaction.serviceType);
    const committed = await this.prisma.utilityTransaction.updateMany({
      where: { id: transaction.id, status: UtilityTransactionStatus.PROCESSING, updatedAt: claimTime },
      data: {
        status: result.status,
        providerStatus: result.providerStatus,
        providerReference: result.providerReference,
        mockToken: result.mockToken ?? transaction.mockToken,
        metadata: this.mergeMetadata(claimedMetadata as Prisma.JsonValue, result.metadata),
        customerNote: result.customerNote,
        failureReason: result.failureReason,
        completedAt: TERMINAL_STATUSES.includes(result.status) ? new Date() : undefined
      }
    });
    if (committed.count === 1 && result.status === UtilityTransactionStatus.FAILED) {
      await this.reverseWalletDebitIfNeeded(transaction.id, result.failureReason ?? "Provider confirmed utility failure.");
    }
    return await this.prisma.utilityTransaction.findUnique({ where: { id: transaction.id }, include: this.customerInclude() }) ?? transaction;
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mockProvider: MockUtilityProvider,
    private readonly accelerateProvider: AccelerateUtilityProvider,
    private readonly audit: AdminAuditService,
    @Optional() private readonly paybetaProvider?: PaybetaUtilityProvider
  ) {}

  listProviders(query: UtilityProvidersQueryDto) {
    return this.prisma.utilityProvider.findMany({
      where: { isActive: true, ...(query.type ? { type: query.type } : {}) },
      select: { id: true, type: true, name: true, code: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  }

  async listProducts(query: UtilityProductsQueryDto) {
    const products = await this.prisma.utilityProduct.findMany({
      where: {
        isActive: true,
        ...(query.providerId ? { providerId: query.providerId } : {}),
        ...(query.type ? { type: query.type } : {}),
        provider: { isActive: true }
      },
      select: {
        id: true,
        providerId: true,
        type: true,
        name: true,
        code: true,
        metadata: true,
        amountKobo: true,
        minAmountKobo: true,
        maxAmountKobo: true,
        provider: { select: { id: true, name: true, code: true, type: true } }
      },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
    const catalogues = new Map<string, Awaited<ReturnType<PaybetaUtilityProvider["listProducts"]>>>();
    const visible = [];
    for (const product of products) {
      if (product.type !== UtilityServiceType.CABLE_TV || this.providerModeForService(product.type) !== "paybeta") {
        visible.push(product);
        continue;
      }
      if (!catalogues.has(product.providerId)) {
        try {
          catalogues.set(product.providerId, await this.paybetaProvider!.listProducts(product.type, product.provider.code));
        } catch {
          throw new ServiceUnavailableException("Cable packages are temporarily unavailable.");
        }
      }
      const current = catalogues.get(product.providerId)!.find(item => item.code === this.paybetaProductCode(product));
      if (current) visible.push({ ...product, name: current.name, amountKobo: current.amountKobo });
    }
    // Keep provider mapping metadata internal to the backend.
    return visible.map(({ metadata: _metadata, ...product }) => product);
  }

  async publicReadiness() {
    const catalogue = await this.catalogueReadiness();
    return {
      services: (Object.values(UtilityServiceType) as UtilityServiceType[]).map((serviceType) => {
        const gate = catalogue[serviceType];
        const paidProcessingEnabled = this.liveCustomerPurchasesEnabled(serviceType);
        const availability = paidProcessingEnabled && gate.status === "READY"
          ? "AVAILABLE"
          : gate.status === "READY"
            ? "PREPARING_LAUNCH"
            : "TEMPORARILY_UNAVAILABLE";
        return {
          serviceType,
          availability,
          note: availability === "AVAILABLE"
            ? `${this.serviceLabel(serviceType)} is available for wallet payment.`
            : availability === "PREPARING_LAUNCH"
              ? `${this.serviceLabel(serviceType)} is preparing for controlled launch.`
              : gate.reason
        };
      })
    };
  }

  async adminConnectivityReadiness(adminUserId: string) {
    const [providerConnectivity, catalogue, operationalProviders] = await Promise.all([
      this.accelerateProvider.connectivityReadiness(),
      this.catalogueReadiness(),
      this.accelerateOperationalProviders()
    ]);
    const persistedIpReadiness = this.latestPersistedIpReadiness(operationalProviders);
    const connectivity: AccelerateConnectivityStatus = providerConnectivity.ipAllowlist === "VERIFICATION_REQUIRED" && persistedIpReadiness?.status === "NOT_VERIFIED"
      ? { ...providerConnectivity, ipAllowlist: "NOT_VERIFIED", safeNote: persistedIpReadiness.safeNote }
      : providerConnectivity;
    if (connectivity.ipAllowlist !== "VERIFICATION_REQUIRED") {
      await this.persistAccelerateIpReadiness(operationalProviders, connectivity.ipAllowlist, connectivity.safeNote, "PROTECTED_REQUERY");
    }
    const providerSelected = this.utilitiesProviderName() === "accelerate";
    const providerEnabled = this.utilitiesPlatformEnabled() && this.accelerateIntegrationEnabled();
    const result = {
      connectivity,
      catalogue,
      gates: {
        providerConfigured: providerSelected && providerEnabled && connectivity.configuration === "READY" ? "READY" : "BLOCKED",
        accelerateAuth: connectivity.authentication === "READY" ? "READY" : "BLOCKED",
        providerIpAccess: connectivity.ipAllowlist === "VERIFIED" ? "READY" : "BLOCKED",
        walletPayment: this.flagValue("UTILITIES_WALLET_PAYMENT_ENABLED", false) ? "READY" : "NOT_ENABLED",
        liveFulfilment: this.flagValue("UTILITIES_LIVE_FULFILLMENT_ENABLED", false) ? "READY" : "NOT_ENABLED",
        customerPurchases: this.customerUtilityPurchasesFlagEnabled() ? "READY" : "NOT_ENABLED"
      }
    };
    await this.audit.record(adminUserId, "admin.utilities.accelerate_readiness_checked", "UtilityProvider", null, {
      environment: connectivity.environment,
      configuration: connectivity.configuration,
      authentication: connectivity.authentication,
      ipAllowlist: connectivity.ipAllowlist,
      services: connectivity.services,
      catalogue
    });
    return result;
  }

  private async catalogueReadiness() {
    const [providers, products] = await Promise.all([
      this.prisma.utilityProvider.findMany({
        where: { isActive: true },
        select: { type: true, name: true, code: true, metadata: true }
      }),
      this.prisma.utilityProduct.findMany({
        where: { isActive: true, provider: { isActive: true } },
        select: {
          type: true,
          name: true,
          code: true,
          amountKobo: true,
          minAmountKobo: true,
          maxAmountKobo: true,
          metadata: true,
          provider: { select: { code: true, metadata: true } }
        }
      })
    ]);
    const liveMetadata = (metadata: Prisma.JsonValue | null | undefined, type: UtilityServiceType) => {
      const value = this.jsonObject(metadata);
      const integration = this.providerModeForService(type) === "paybeta" ? "PAYBETA" : "ACCELERATE";
      return value.catalogueMode === "LIVE" && value.integration === integration && value.demoOnly !== true;
    };
    const liveProvider = (item: typeof providers[number]) =>
      Boolean(item.name.trim()) && !item.code.startsWith("DEMO_") && liveMetadata(item.metadata, item.type);
    const validProductAmount = (item: typeof products[number]) =>
      (typeof item.amountKobo === "number" && item.amountKobo > 0) ||
      (typeof item.minAmountKobo === "number" && item.minAmountKobo > 0 &&
        typeof item.maxAmountKobo === "number" && item.maxAmountKobo >= item.minAmountKobo);
    const liveProduct = (item: typeof products[number]) =>
      Boolean(item.name.trim()) &&
      !item.code.startsWith("DEMO_") &&
      !item.provider.code.startsWith("DEMO_") &&
      liveMetadata(item.metadata, item.type) &&
      liveMetadata(item.provider.metadata, item.type) &&
      validProductAmount(item);
    const providerReady = (type: UtilityServiceType) => providers.some((item) => item.type === type && (
      this.providerModeForService(type) === "paybeta"
        ? Boolean(item.name.trim()) && !item.code.startsWith("DEMO_")
        : liveProvider(item)
    ));
    const liveProductReady = (type: UtilityServiceType) => products.some((item) => item.type === type && liveProduct(item));
    const gate = (type: UtilityServiceType, requiresLiveProducts: boolean) => {
      const ready = providerReady(type) && (!requiresLiveProducts || liveProductReady(type));
      return {
        status: ready ? "READY" as const : "BLOCKED" as const,
        reason: ready
          ? `${this.serviceLabel(type)} provider configuration is ready.`
          : requiresLiveProducts
            ? `Live Accelerate ${this.serviceLabel(type)} package codes required.`
            : `No active live ${this.serviceLabel(type)} provider records configured.`
      };
    };
    return {
      AIRTIME: gate(UtilityServiceType.AIRTIME, false),
      DATA: gate(UtilityServiceType.DATA, true),
      ELECTRICITY: gate(UtilityServiceType.ELECTRICITY, false),
      CABLE_TV: gate(UtilityServiceType.CABLE_TV, true)
    };
  }

  async quote(userId: string, dto: UtilityQuoteDto) {
    this.assertLiveCustomerPurchaseGate(dto.serviceType);
    const customer = await this.requireCustomer(userId);
    const utilityProvider = this.activeUtilityProvider(dto.serviceType);
    let resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>> & { recipientAddress?: string; recipientVerified?: boolean } =
      await this.resolveRequest(dto, utilityProvider.client);
    this.assertAccelerateLiveRequestAllowed(resolved, utilityProvider);
    const providerQuote = await this.safeProviderQuote(customer, resolved, utilityProvider.client);
    resolved = this.withVerifiedRecipient(resolved, providerQuote);
    return {
      quoteReference: this.reference("KGO-UTIL-QUOTE"),
      customerId: customer.id,
      serviceType: resolved.provider.type,
      provider: this.publicProvider(resolved.provider),
      product: resolved.product ? this.publicProduct(resolved.product) : null,
      amountKobo: resolved.amountKobo,
      convenienceFeeKobo: resolved.convenienceFeeKobo,
      totalKobo: resolved.totalKobo,
      recipient: this.maskRecipient(resolved.recipient),
      recipientName: resolved.recipientName,
      recipientAddress: resolved.recipientAddress,
      recipientVerified: providerQuote.recipientVerified,
      providerStatus: providerQuote.providerStatus,
      customerNote: providerQuote.customerNote,
      providerMode: utilityProvider.mode,
      testMode: utilityProvider.testMode,
      createdAt: new Date().toISOString()
    };
  }

  async createTransaction(userId: string, dto: CreateUtilityTransactionDto) {
    this.assertLiveCustomerPurchaseGate(dto.serviceType);
    const customer = await this.requireCustomer(userId);
    const utilityProvider = this.activeUtilityProvider(dto.serviceType);
    if (this.walletUtilityPaymentEnabled(utilityProvider)) {
      const existing = await this.findIdempotentWalletUtilityTransaction(customer.id, dto.idempotencyKey);
      if (existing) return this.customerTransaction(existing);
    }
    let resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>> & { recipientAddress?: string; recipientVerified?: boolean } =
      await this.resolveRequest(dto, utilityProvider.client);
    this.assertAccelerateLiveRequestAllowed(resolved, utilityProvider);
    const providerQuote = await this.safeProviderQuote(customer, resolved, utilityProvider.client);
    resolved = this.withVerifiedRecipient(resolved, providerQuote);
    const reference = await this.uniqueReference();
    if (this.walletUtilityPaymentEnabled(utilityProvider)) {
      return this.createWalletFundedTransaction(customer, dto, resolved, reference, utilityProvider);
    }
    if (["accelerate", "paybeta"].includes(utilityProvider.mode) && !utilityProvider.testMode) {
      throw new BadRequestException("Live Utilities require wallet payment and live fulfilment flags.");
    }
    const transaction = await this.prisma.utilityTransaction.create({
      data: {
        reference,
        customerId: customer.id,
        serviceType: resolved.provider.type,
        providerId: resolved.provider.id,
        productId: resolved.product?.id,
        amountKobo: resolved.amountKobo,
        convenienceFeeKobo: resolved.convenienceFeeKobo,
        totalKobo: resolved.totalKobo,
        recipient: resolved.recipient,
        recipientName: resolved.recipientName,
        status: UtilityTransactionStatus.PENDING,
        providerStatus: `${utilityProvider.providerStatusPrefix}_PENDING`,
        customerNote: dto.customerNote,
        metadata: this.utilityMetadata(
          utilityProvider.mode,
          utilityProvider.testMode,
          undefined,
          resolved.meterType,
          resolved.recipientAddress,
          providerQuote.recipientVerified
        )
      },
      include: this.customerInclude()
    });
    const purchase = await utilityProvider.client.purchase({
      serviceType: resolved.provider.type,
      providerCode: resolved.provider.code,
      productCode: this.providerModeForService(resolved.provider.type).startsWith("paybeta") ? this.paybetaProductCode(resolved.product) : resolved.product?.code,
      amountKobo: resolved.amountKobo,
      recipient: resolved.recipient,
      recipientName: resolved.recipientName,
      recipientAddress: resolved.recipientAddress,
      meterType: resolved.meterType,
      customerPhoneNumber: customer.user?.phoneNumber,
      customerEmail: customer.user?.email,
      reference,
      totalKobo: resolved.totalKobo
    });
    const updated = await this.applyProviderResult(transaction.id, purchase, this.customerInclude(), transaction.metadata);
    return this.customerTransaction(updated);
  }

  private async createWalletFundedTransaction(
    customer: Awaited<ReturnType<UtilitiesService["requireCustomer"]>>,
    dto: CreateUtilityTransactionDto,
    resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>> & { recipientAddress?: string; recipientVerified?: boolean },
    reference: string,
    utilityProvider: ReturnType<UtilitiesService["activeUtilityProvider"]>
  ) {
    const customerId = customer.id;
    const amount = this.walletAmountFromKobo(resolved.totalKobo);
    const idempotencyKey = this.walletDebitIdempotencyKey(customerId, dto.idempotencyKey ?? reference);
    const created = await this.prisma.$transaction(async (tx) => {
      const existingLedger = await tx.customerWalletLedgerEntry.findUnique({
        where: { idempotencyKey },
        include: { wallet: true }
      });
      if (existingLedger?.sourceId) {
        const existingTransaction = await tx.utilityTransaction.findFirst({
          where: { id: existingLedger.sourceId, customerId },
          include: this.customerInclude()
        });
        if (existingTransaction) {
          return { transaction: existingTransaction, duplicate: true };
        }
      }

      const wallet = await tx.customerWallet.upsert({
        where: { customerId },
        update: {},
        create: { customerId }
      });
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException("Only active wallets can pay for Utilities.");
      }
      if (wallet.availableBalance.lessThan(amount)) {
        throw new BadRequestException("Insufficient wallet balance. Please top up your wallet and try again.");
      }

      const now = new Date();
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore.sub(amount);
      const transaction = await tx.utilityTransaction.create({
        data: {
          reference,
          customerId,
          serviceType: resolved.provider.type,
          providerId: resolved.provider.id,
          productId: resolved.product?.id,
          amountKobo: resolved.amountKobo,
          convenienceFeeKobo: resolved.convenienceFeeKobo,
          totalKobo: resolved.totalKobo,
          recipient: resolved.recipient,
          recipientName: resolved.recipientName,
          status: UtilityTransactionStatus.PENDING,
          providerStatus: `${utilityProvider.providerStatusPrefix}_PENDING`,
          customerNote: "Your KariGO Wallet has been debited. Utility fulfilment is being processed.",
          metadata: this.utilityMetadata(
            utilityProvider.mode,
            utilityProvider.testMode,
            "WALLET",
            resolved.meterType,
            resolved.recipientAddress,
            resolved.recipientVerified
          )
        }
      });
      await tx.customerWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          ledgerBalance: balanceAfter,
          lastActivityAt: now
        }
      });
      const debitLedger = await tx.customerWalletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          customerId,
          entryType: WalletLedgerEntryType.SERVICE_PAYMENT,
          direction: WalletLedgerDirection.DEBIT,
          status: WalletLedgerEntryStatus.POSTED,
          amount,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter,
          reference: `${reference}-WALLET-DEBIT`,
          idempotencyKey,
          sourceType: UTILITY_WALLET_SOURCE_TYPE,
          sourceId: transaction.id,
          description: `Utilities wallet payment for ${reference}`,
          metadata: {
            utilityTransactionId: transaction.id,
            utilityReference: reference,
            serviceType: resolved.provider.type,
            providerId: resolved.provider.id
          } as Prisma.InputJsonValue,
          postedAt: now
        }
      });
      const transactionWithMetadata = await tx.utilityTransaction.update({
        where: { id: transaction.id },
        data: {
          metadata: this.mergeMetadata(transaction.metadata, {
            paymentMethod: "WALLET",
            walletDebitLedgerEntryId: debitLedger.id,
            walletDebitReference: debitLedger.reference,
            walletDebitStatus: debitLedger.status,
            walletDebitAmount: amount.toFixed(2),
            walletBalanceAfterDebit: balanceAfter.toFixed(2)
          })
        },
        include: this.customerInclude()
      });
      return { transaction: transactionWithMetadata, duplicate: false };
    });

    if (created.duplicate) return this.customerTransaction(created.transaction);

    let purchase: UtilityPurchaseResult;
    try {
      purchase = await utilityProvider.client.purchase({
        serviceType: resolved.provider.type,
        providerCode: resolved.provider.code,
        productCode: this.providerModeForService(resolved.provider.type).startsWith("paybeta") ? this.paybetaProductCode(resolved.product) : resolved.product?.code,
        amountKobo: resolved.amountKobo,
        recipient: resolved.recipient,
        recipientName: resolved.recipientName,
        recipientAddress: resolved.recipientAddress,
        meterType: resolved.meterType,
        customerPhoneNumber: customer.user?.phoneNumber,
        customerEmail: customer.user?.email,
        reference,
        totalKobo: resolved.totalKobo
      });
      if (utilityProvider.mode === "accelerate") {
        await this.recordAccelerateOperationReadiness([resolved.provider], purchase);
      }
    } catch {
      const reversed = await this.reverseWalletDebitIfNeeded(created.transaction.id, "Utilities provider could not be reached safely.");
      return this.customerTransaction(reversed ?? created.transaction);
    }
    const updated = await this.applyProviderResult(created.transaction.id, purchase, this.customerInclude(), created.transaction.metadata);
    if (purchase.status === UtilityTransactionStatus.FAILED) {
      const reversed = await this.reverseWalletDebitIfNeeded(created.transaction.id, purchase.failureReason ?? "Utilities provider reported a failed transaction.");
      return this.customerTransaction(reversed ?? updated);
    }
    return this.customerTransaction(updated);
  }

  async adminVerifyProviderStatus(adminUserId: string, transactionId: string) {
    const transaction = await this.prisma.utilityTransaction.findUnique({
      where: { id: transactionId },
      include: this.adminInclude(true)
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    const transactionMetadata = this.jsonObject(transaction.metadata);
    const providerMode = this.transactionProviderMode(transaction.metadata);
    const compensationConflictCandidate = transaction.status === UtilityTransactionStatus.FAILED &&
      providerMode === "paybeta" && transactionMetadata.walletDebitStatus === WalletLedgerEntryStatus.REVERSED;
    if (transactionMetadata.manualReconciliationRequired === true && transactionMetadata.compensationConflict === true) {
      return this.adminTransaction(transaction);
    }
    if (TERMINAL_STATUSES.includes(transaction.status) && !compensationConflictCandidate) return this.adminTransaction(transaction);

    const utilityProvider = this.providerForMode(providerMode);
    const purchase = await utilityProvider.client.checkStatus(transaction.providerReference ?? transaction.reference, transaction.serviceType);
    if (utilityProvider.mode === "accelerate") {
      await this.recordAccelerateOperationReadiness([transaction.provider], purchase);
    }
    if (purchase.status === UtilityTransactionStatus.SUCCESSFUL && transactionMetadata.walletDebitStatus === WalletLedgerEntryStatus.REVERSED) {
      const conflict = await this.prisma.utilityTransaction.update({
        where: { id: transaction.id },
        data: {
          providerStatus: "PAYBETA_SUCCESSFUL_COMPENSATION_CONFLICT",
          providerReference: purchase.providerReference,
          mockToken: purchase.mockToken ?? transaction.mockToken,
          customerNote: "Provider fulfilment was confirmed after wallet compensation. Manual reconciliation is required.",
          failureReason: "Provider fulfilled this transaction after its wallet debit was reversed; manual reconciliation is required.",
          metadata: this.mergeMetadata(transaction.metadata, {
            ...purchase.metadata,
            compensationConflict: true,
            manualReconciliationRequired: true,
            compensationConflictDetectedAt: new Date().toISOString(),
            providerConfirmedStatus: purchase.status
          })
        },
        include: this.adminInclude(true)
      });
      await this.audit.record(adminUserId, "admin.utilities.compensation_conflict", "UtilityTransaction", transactionId, {
        providerMode: utilityProvider.mode,
        status: conflict.status,
        providerStatus: conflict.providerStatus,
        manualReconciliationRequired: true
      });
      return this.adminTransaction(conflict);
    }
    const updated = await this.applyProviderResult(transaction.id, purchase, this.adminInclude(true), transaction.metadata);
    if (purchase.status === UtilityTransactionStatus.FAILED) {
      const reversed = await this.reverseWalletDebitIfNeeded(transaction.id, purchase.failureReason ?? "Utilities provider reported a failed transaction.", true);
      if (reversed) {
        await this.audit.record(adminUserId, "admin.utilities.wallet_reversal", "UtilityTransaction", transactionId, {
          providerMode: utilityProvider.mode,
          status: reversed.status,
          providerStatus: reversed.providerStatus
        });
        return this.adminTransaction(reversed as Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>);
      }
    }
    await this.audit.record(adminUserId, "admin.utilities.provider_verify", "UtilityTransaction", transactionId, {
      providerMode: utilityProvider.mode,
      status: updated.status,
      providerStatus: updated.providerStatus
    });
    return this.adminTransaction(updated as Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>);
  }

  private applyProviderResult(
    transactionId: string,
    purchase: UtilityPurchaseResult,
    include: ReturnType<UtilitiesService["customerInclude"]>,
    currentMetadata?: Prisma.JsonValue | null
  ): Promise<Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["customerInclude"]> }>>;
  private applyProviderResult(
    transactionId: string,
    purchase: UtilityPurchaseResult,
    include: ReturnType<UtilitiesService["adminInclude"]>,
    currentMetadata?: Prisma.JsonValue | null
  ): Promise<Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>>;
  private async applyProviderResult(
    transactionId: string,
    purchase: UtilityPurchaseResult,
    include: ReturnType<UtilitiesService["customerInclude"]> | ReturnType<UtilitiesService["adminInclude"]>,
    currentMetadata?: Prisma.JsonValue | null
  ) {
    const customerNote = purchase.customerNote ?? (purchase.status === UtilityTransactionStatus.SUCCESSFUL
      ? "Utility payment successful. Your request has been processed."
      : purchase.status === UtilityTransactionStatus.FAILED
        ? "Utility payment failed. Your wallet reversal will be confirmed if a debit was posted."
        : "Your utility payment is being processed. Please check status shortly.");
    return this.prisma.utilityTransaction.update({
      where: { id: transactionId },
      data: {
        status: purchase.status,
        providerStatus: purchase.providerStatus,
        providerReference: purchase.providerReference,
        mockToken: purchase.mockToken,
        customerNote,
        failureReason: purchase.failureReason,
        metadata: this.mergeMetadata(currentMetadata, purchase.metadata),
        completedAt: TERMINAL_STATUSES.includes(purchase.status) ? new Date() : undefined
      },
      include
    }) as Promise<
      Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["customerInclude"]> }> |
      Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>
    >;
  }

  private async reverseWalletDebitIfNeeded(
    transactionId: string,
    reason: string,
    adminInclude = false,
    finalStatus: UtilityTransactionStatus = UtilityTransactionStatus.FAILED,
    customerNote = "Utility payment failed. Your wallet has been reversed.",
    extraMetadata: Record<string, unknown> = {}
  ) {
    const transaction = await this.prisma.utilityTransaction.findUnique({
      where: { id: transactionId },
      include: adminInclude ? this.adminInclude(true) : this.customerInclude()
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    const metadata = this.jsonObject(transaction.metadata);
    const debitLedgerEntryId = typeof metadata.walletDebitLedgerEntryId === "string" ? metadata.walletDebitLedgerEntryId : undefined;
    if (!debitLedgerEntryId) return null;

    return this.prisma.$transaction(async (tx) => {
      const debitLedger = await tx.customerWalletLedgerEntry.findUnique({ where: { id: debitLedgerEntryId } });
      if (!debitLedger) return transaction;
      const reversalIdempotencyKey = `utility:${transaction.reference}:wallet-reversal`;
      const existingReversal = await tx.customerWalletLedgerEntry.findUnique({
        where: { idempotencyKey: reversalIdempotencyKey }
      });
      if (existingReversal) {
        const refreshed = await tx.utilityTransaction.update({
          where: { id: transaction.id },
          data: {
            status: finalStatus,
            customerNote,
            failureReason: reason,
            metadata: this.mergeMetadata(transaction.metadata, {
              ...extraMetadata,
              walletDebitStatus: "REVERSED",
              walletReversalLedgerEntryId: existingReversal.id,
              walletReversalReference: existingReversal.reference,
              walletReversalStatus: existingReversal.status
            })
          },
          include: adminInclude ? this.adminInclude(true) : this.customerInclude()
        });
        return refreshed;
      }
      if (debitLedger.status !== WalletLedgerEntryStatus.POSTED) {
        return transaction;
      }
      const wallet = await tx.customerWallet.findUnique({ where: { id: debitLedger.walletId } });
      if (!wallet) throw new NotFoundException("Customer wallet not found");
      const now = new Date();
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = wallet.availableBalance.add(debitLedger.amount);
      await tx.customerWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          ledgerBalance: balanceAfter,
          lastActivityAt: now
        }
      });
      await tx.customerWalletLedgerEntry.update({
        where: { id: debitLedger.id },
        data: {
          status: WalletLedgerEntryStatus.REVERSED,
          reversedAt: now,
          metadata: this.mergeMetadata(debitLedger.metadata, {
            reversedForUtilityTransactionId: transaction.id,
            reversalReason: reason
          })
        }
      });
      const reversalLedger = await tx.customerWalletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          customerId: wallet.customerId,
          entryType: WalletLedgerEntryType.REVERSAL,
          direction: WalletLedgerDirection.CREDIT,
          status: WalletLedgerEntryStatus.POSTED,
          amount: debitLedger.amount,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter,
          reference: `${transaction.reference}-WALLET-REVERSAL`,
          idempotencyKey: reversalIdempotencyKey,
          sourceType: UTILITY_WALLET_REVERSAL_SOURCE_TYPE,
          sourceId: transaction.id,
          description: `Wallet reversal for failed utility transaction ${transaction.reference}`,
          metadata: {
            utilityTransactionId: transaction.id,
            utilityReference: transaction.reference,
            debitLedgerEntryId: debitLedger.id,
            debitReference: debitLedger.reference
          } as Prisma.InputJsonValue,
          postedAt: now
        }
      });
      return tx.utilityTransaction.update({
        where: { id: transaction.id },
        data: {
          status: finalStatus,
          customerNote,
          failureReason: reason,
          metadata: this.mergeMetadata(transaction.metadata, {
            ...extraMetadata,
            walletDebitStatus: WalletLedgerEntryStatus.REVERSED,
            walletReversalLedgerEntryId: reversalLedger.id,
            walletReversalReference: reversalLedger.reference,
            walletReversalStatus: reversalLedger.status,
            walletBalanceAfterReversal: balanceAfter.toFixed(2)
          })
        },
        include: adminInclude ? this.adminInclude(true) : this.customerInclude()
      });
    });
  }

  async listMine(userId: string, query: ListUtilityTransactionsQueryDto) {
    const customer = await this.requireCustomer(userId);
    const transactions = await this.prisma.utilityTransaction.findMany({
      where: { customerId: customer.id, ...this.transactionFilters(query) },
      include: this.customerInclude(),
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return transactions.map((transaction) => this.customerTransaction(transaction, true));
  }

  async customerDetail(userId: string, transactionId: string) {
    const customer = await this.requireCustomer(userId);
    const transaction = await this.prisma.utilityTransaction.findFirst({
      where: { id: transactionId, customerId: customer.id },
      include: this.customerInclude()
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    return this.customerTransaction(await this.reconcileTransaction(transaction));
  }

  async cancel(userId: string, transactionId: string) {
    const customer = await this.requireCustomer(userId);
    const transaction = await this.prisma.utilityTransaction.findFirst({
      where: { id: transactionId, customerId: customer.id },
      include: this.customerInclude()
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    if (transaction.status === UtilityTransactionStatus.CANCELLED) {
      return this.customerTransaction(transaction);
    }
    if (TERMINAL_STATUSES.includes(transaction.status)) {
      throw new BadRequestException("This utility transaction can no longer be cancelled.");
    }
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(transaction.status)) {
      throw new BadRequestException("This utility request is already being processed by the provider and cannot be cancelled from the app.");
    }
    const metadata = this.jsonObject(transaction.metadata);
    const cancellationReason = "Cancelled by customer before provider fulfilment.";
    const cancellationNote = "Utility request cancelled before fulfilment.";
    const cancellationMetadata = {
      cancelledBy: "customer",
      cancellationStatus: "ACCEPTED",
      cancelledAt: new Date().toISOString()
    };
    if (typeof metadata.walletDebitLedgerEntryId === "string") {
      const reversed = await this.reverseWalletDebitIfNeeded(
        transaction.id,
        cancellationReason,
        false,
        UtilityTransactionStatus.CANCELLED,
        "Utility request cancelled. Your wallet has been reversed.",
        cancellationMetadata
      );
      if (reversed) return this.customerTransaction(reversed);
    }
    const updated = await this.prisma.utilityTransaction.update({
      where: { id: transaction.id },
      data: {
        status: UtilityTransactionStatus.CANCELLED,
        providerStatus: "CUSTOMER_CANCELLED",
        customerNote: cancellationNote,
        failureReason: cancellationReason,
        metadata: this.mergeMetadata(transaction.metadata, {
          ...cancellationMetadata,
          walletReversalStatus: "NOT_REQUIRED"
        }),
        completedAt: new Date()
      },
      include: this.customerInclude()
    });
    return this.customerTransaction(updated);
  }

  async adminSummary() {
    const [total, pending, successful, failed, totalValue] = await Promise.all([
      this.prisma.utilityTransaction.count(),
      this.prisma.utilityTransaction.count({ where: { status: { in: [UtilityTransactionStatus.PENDING, UtilityTransactionStatus.PROCESSING] } } }),
      this.prisma.utilityTransaction.count({ where: { status: UtilityTransactionStatus.SUCCESSFUL } }),
      this.prisma.utilityTransaction.count({ where: { status: UtilityTransactionStatus.FAILED } }),
      this.prisma.utilityTransaction.aggregate({ _sum: { totalKobo: true } })
    ]);
    const valueKobo = totalValue._sum.totalKobo ?? 0;
    return { totalTransactions: total, pending, successful, failed, totalValueKobo: valueKobo, totalTestValueKobo: valueKobo };
  }

  async adminList(query: ListUtilityTransactionsQueryDto) {
    const transactions = await this.prisma.utilityTransaction.findMany({
      where: this.transactionFilters(query),
      include: this.adminInclude(false),
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return transactions.map((transaction) => this.adminTransaction(transaction, true));
  }

  async adminDetail(transactionId: string) {
    const transaction = await this.prisma.utilityTransaction.findUnique({
      where: { id: transactionId },
      include: this.adminInclude(true)
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    return this.adminTransaction(transaction);
  }

  async adminUpdateStatus(adminUserId: string, transactionId: string, dto: UpdateUtilityTransactionStatusDto) {
    if (this.config.get<string>("APP_ENV") === "production") {
      throw new ForbiddenException("Manual utility status override is disabled in production.");
    }
    const current = await this.adminDetail(transactionId);
    if (dto.status === UtilityTransactionStatus.SUCCESSFUL && this.isAccelerateIpDenialStatus(current.providerStatus)) {
      throw new ForbiddenException("Provider-denied utility transactions cannot be marked successful without an explicit audited override policy.");
    }
    const updated = await this.prisma.utilityTransaction.update({
      where: { id: transactionId },
      data: {
        status: dto.status,
        providerStatus: `ADMIN_${dto.status}`,
        failureReason: dto.status === UtilityTransactionStatus.FAILED ? dto.note ?? "Marked failed by admin in staging." : undefined,
        completedAt: TERMINAL_STATUSES.includes(dto.status) ? new Date() : null,
        metadata: {
          ...(typeof current.metadata === "object" && current.metadata ? current.metadata : {}),
          adminOverride: true,
          adminOverrideNote: dto.note ?? null
        } as Prisma.InputJsonObject
      },
      include: this.adminInclude(true)
    });
    await this.audit.record(adminUserId, "admin.utilities.status_override", "UtilityTransaction", transactionId, { status: dto.status, note: dto.note });
    return this.adminTransaction(updated);
  }

  private async resolveRequest(dto: UtilityQuoteDto, providerClient: UtilityProviderClient) {
    const provider = await this.prisma.utilityProvider.findFirst({
      where: { id: dto.providerId, type: dto.serviceType, isActive: true }
    });
    if (!provider) throw new NotFoundException("Utility provider not found");

    let product = dto.productId ? await this.prisma.utilityProduct.findFirst({
      where: { id: dto.productId, providerId: provider.id, type: provider.type, isActive: true }
    }) : null;
    if (dto.productId && !product) throw new NotFoundException("Utility product not found");

    if (provider.type === UtilityServiceType.CABLE_TV && this.providerModeForService(provider.type) === "paybeta") {
      if (!product) throw new BadRequestException("Select a Cable TV package.");
      let liveProducts;
      try { liveProducts = await this.paybetaProvider!.listProducts(provider.type, provider.code); }
      catch { throw new ServiceUnavailableException("Cable packages are temporarily unavailable."); }
      const current = liveProducts.find(item => item.code === this.paybetaProductCode(product!));
      if (!current) throw new BadRequestException("This Cable TV package is no longer available.");
      product = { ...product, name: current.name, amountKobo: current.amountKobo };
    }

    const amountKobo = this.resolveAmount(provider.type, product, dto.amountKobo);
    const validation = await providerClient.validateRecipient(provider.type, dto.recipient);
    if (!validation.isValid || !validation.normalizedRecipient) {
      throw new BadRequestException(validation.message ?? "Recipient could not be validated.");
    }
    const convenienceFeeKobo = this.config.get<number>("UTILITY_CONVENIENCE_FEE_KOBO", 0);
    return {
      provider,
      product,
      amountKobo,
      convenienceFeeKobo,
      totalKobo: amountKobo + convenienceFeeKobo,
      recipient: validation.normalizedRecipient,
      recipientName: dto.recipientName ?? validation.recipientName,
      meterType: provider.type === UtilityServiceType.ELECTRICITY ? dto.meterType ?? "PREPAID" : undefined
    };
  }

  private async safeProviderQuote(
    customer: Awaited<ReturnType<UtilitiesService["requireCustomer"]>>,
    resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>>,
    providerClient: UtilityProviderClient
  ) {
    try {
      const quote = await providerClient.quote({
        serviceType: resolved.provider.type,
        providerCode: resolved.provider.code,
        productCode: this.providerModeForService(resolved.provider.type).startsWith("paybeta") ? this.paybetaProductCode(resolved.product) : resolved.product?.code,
        amountKobo: resolved.amountKobo,
        recipient: resolved.recipient,
        recipientName: resolved.recipientName,
        meterType: resolved.meterType,
        customerPhoneNumber: customer.user?.phoneNumber,
        customerEmail: customer.user?.email
      }) ?? {
        providerStatus: "PROVIDER_READY",
        customerNote: "Utility request validated."
      };
      if (quote.recipientVerified === false) {
        throw new BadRequestException(quote.customerNote || "Utility recipient validation failed.");
      }
      if (quote.isPurchasable === false) {
        throw new ServiceUnavailableException(quote.customerNote || "Utility provider is temporarily unavailable. Please try again later.");
      }
      return quote;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("Utility provider is temporarily unavailable. Please try again later.");
    }
  }

  private withVerifiedRecipient<T extends { provider: { type: UtilityServiceType }; recipientName?: string; recipientAddress?: string; recipientVerified?: boolean }>(
    resolved: T,
    quote: UtilityQuoteResult
  ): T & { recipientAddress?: string; recipientVerified?: boolean } {
    if (resolved.provider.type !== UtilityServiceType.ELECTRICITY && resolved.provider.type !== UtilityServiceType.CABLE_TV) {
      return resolved;
    }
    return {
      ...resolved,
      recipientName: quote.recipientName,
      recipientAddress: quote.recipientAddress,
      recipientVerified: quote.recipientVerified
    };
  }

  private resolveAmount(type: UtilityServiceType, product: { amountKobo: number | null; minAmountKobo: number | null; maxAmountKobo: number | null } | null, requested?: number) {
    const amount = product?.amountKobo ?? requested;
    if (!amount) throw new BadRequestException("Amount is required for this utility transaction.");
    if (product?.amountKobo && requested && requested !== product.amountKobo) {
      throw new BadRequestException("Selected product amount does not match the requested amount.");
    }
    const boundaries = DEFAULT_AMOUNT_BOUNDARIES[type];
    const min = product?.minAmountKobo ?? boundaries.min;
    const max = product?.maxAmountKobo ?? boundaries.max;
    if (amount < min || amount > max) {
      throw new BadRequestException(`Amount must be between ${min} and ${max} kobo.`);
    }
    return amount;
  }

  private paybetaProductCode(product: { code: string; metadata?: Prisma.JsonValue | null } | null | undefined) {
    if (!product) return undefined;
    const metadata = this.jsonObject(product.metadata);
    return typeof metadata.providerProductCode === "string" ? metadata.providerProductCode : product.code;
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true, user: { select: { phoneNumber: true, email: true } } }
    });
    if (!customer) throw new NotFoundException("Customer profile not found");
    return customer;
  }

  private transactionFilters(query: ListUtilityTransactionsQueryDto) {
    return {
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? {
        OR: [
          { reference: { contains: query.search, mode: "insensitive" as const } },
          { provider: { name: { contains: query.search, mode: "insensitive" as const } } },
          { customer: { user: { fullName: { contains: query.search, mode: "insensitive" as const } } } }
        ]
      } : {}),
      ...(query.dateFrom || query.dateTo ? {
        createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
        }
      } : {})
    };
  }

  private async uniqueReference() {
    for (let i = 0; i < 5; i += 1) {
      const reference = this.reference("KGO-UTIL");
      const existing = await this.prisma.utilityTransaction.findUnique({ where: { reference }, select: { id: true } });
      if (!existing) return reference;
    }
    throw new BadRequestException("Could not generate a unique utility reference. Please try again.");
  }

  private reference(prefix: string) {
    return `${prefix}-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  private activeUtilityProvider(serviceType: UtilityServiceType) {
    const mode = this.providerModeForService(serviceType);
    if (mode === "paybeta_sandbox" || mode === "paybeta") {
      const environment = mode === "paybeta" ? "production" : "sandbox";
      if (!this.paybetaProvider?.isConfigured(environment)) {
        throw new BadRequestException("Paybeta utilities are not configured. Please try again later.");
      }
      return {
        client: this.paybetaProvider,
        mode,
        providerStatusPrefix: mode === "paybeta" ? "PAYBETA" : "PAYBETA_SANDBOX",
        testMode: mode === "paybeta_sandbox"
      };
    }
    if (mode === "accelerate" && this.utilitiesPlatformEnabled() && this.customerUtilityPurchasesFlagEnabled()) {
      if (!this.accelerateProvider.isConfigured()) {
        throw new BadRequestException("Utilities are being activated. Please try again later.");
      }
      return {
        client: this.accelerateProvider,
        mode: "accelerate",
        providerStatusPrefix: "ACCELERATE",
        testMode: this.flagValue("UTILITIES_TEST_MODE", true)
      };
    }
    return this.providerForMode(mode);
  }

  private providerForMode(mode: string) {
    if ((mode === "paybeta_sandbox" || mode === "paybeta") && this.paybetaProvider?.isConfigured(mode === "paybeta" ? "production" : "sandbox")) {
      return {
        client: this.paybetaProvider,
        mode,
        providerStatusPrefix: mode === "paybeta" ? "PAYBETA" : "PAYBETA_SANDBOX",
        testMode: mode === "paybeta_sandbox"
      };
    }
    if (mode === "accelerate" && this.accelerateProvider.isConfigured()) {
      return {
        client: this.accelerateProvider,
        mode: "accelerate",
        providerStatusPrefix: "ACCELERATE",
        testMode: this.flagValue("UTILITIES_TEST_MODE", true)
      };
    }
    return {
      client: this.mockProvider,
      mode: "mock",
      providerStatusPrefix: "MOCK",
      testMode: true
    };
  }

  private liveCustomerPurchasesEnabled(serviceType: UtilityServiceType) {
    const mode = this.providerModeForService(serviceType);
    return this.utilitiesPlatformEnabled() &&
      this.customerUtilityPurchasesFlagEnabled() &&
      !this.flagValue("UTILITIES_TEST_MODE", true) &&
      this.flagValue("UTILITIES_WALLET_PAYMENT_ENABLED", false) &&
      this.flagValue("UTILITIES_LIVE_FULFILLMENT_ENABLED", false) &&
      (mode === "paybeta" || (mode === "accelerate" && this.accelerateIntegrationEnabled()));
  }

  private utilitiesProviderName() {
    return this.stringValue("UTILITIES_PROVIDER", this.stringValue("UTILITIES_PROVIDER_NAME", "mock"));
  }

  private providerModeForService(serviceType: UtilityServiceType) {
    const key: Record<UtilityServiceType, string> = {
      AIRTIME: "UTILITIES_AIRTIME_PROVIDER",
      DATA: "UTILITIES_DATA_PROVIDER",
      ELECTRICITY: "UTILITIES_ELECTRICITY_PROVIDER",
      CABLE_TV: "UTILITIES_CABLE_PROVIDER"
    };
    return this.stringValue(key[serviceType], this.utilitiesProviderName());
  }

  private utilitiesPlatformEnabled() {
    return this.flagValue("UTILITIES_ENABLED", false) || this.flagValue("UTILITIES_PROVIDER_ENABLED", false);
  }

  private accelerateIntegrationEnabled() {
    return this.flagValue("ACCELERATE_ENABLED", false) || this.flagValue("ACCELERATE_UTILITIES_ENABLED", false);
  }

  private walletUtilityPaymentEnabled(utilityProvider: ReturnType<UtilitiesService["activeUtilityProvider"]>) {
    return ["accelerate", "paybeta"].includes(utilityProvider.mode) &&
      !utilityProvider.testMode &&
      this.customerUtilityPurchasesFlagEnabled() &&
      this.flagValue("UTILITIES_WALLET_PAYMENT_ENABLED", false) &&
      this.flagValue("UTILITIES_LIVE_FULFILLMENT_ENABLED", false);
  }

  private customerUtilityPurchasesFlagEnabled() {
    const primary = this.optionalFlagValue("UTILITIES_CUSTOMER_PURCHASE_ENABLED");
    return primary ?? this.flagValue("UTILITIES_CUSTOMER_PURCHASES_ENABLED", false);
  }

  private async accelerateOperationalProviders() {
    const providers = await this.prisma.utilityProvider.findMany({
      where: { isActive: true },
      select: { id: true, metadata: true }
    });
    return providers.filter((provider) => {
      const metadata = this.jsonObject(provider.metadata);
      return typeof metadata.integration === "string" && metadata.integration.toUpperCase() === "ACCELERATE";
    });
  }

  private latestPersistedIpReadiness(providers: Array<{ id: string; metadata: Prisma.JsonValue | null }>) {
    return providers
      .map((provider) => {
        const readiness = this.jsonObject(this.jsonObject(provider.metadata).accelerateIpReadiness as Prisma.JsonValue | undefined);
        const status = readiness.status;
        const checkedAt = readiness.checkedAt;
        const safeNote = readiness.safeNote;
        if ((status !== "VERIFIED" && status !== "NOT_VERIFIED") || typeof checkedAt !== "string" || typeof safeNote !== "string") return null;
        return { status, checkedAt, safeNote };
      })
      .filter((signal): signal is { status: "VERIFIED" | "NOT_VERIFIED"; checkedAt: string; safeNote: string } => Boolean(signal))
      .sort((left, right) => Date.parse(right.checkedAt) - Date.parse(left.checkedAt))[0];
  }

  private async recordAccelerateOperationReadiness(
    providers: Array<{ id: string; metadata: Prisma.JsonValue | null }>,
    purchase: UtilityPurchaseResult
  ) {
    if (!this.isAccelerateIpDenialResult(purchase)) return;
    await this.persistAccelerateIpReadiness(providers, "NOT_VERIFIED", ACCELERATE_IP_DENIAL_NOTE, "LIVE_OPERATION");
  }

  private async persistAccelerateIpReadiness(
    providers: Array<{ id: string; metadata: Prisma.JsonValue | null }>,
    status: "VERIFIED" | "NOT_VERIFIED",
    safeNote: string,
    source: "PROTECTED_REQUERY" | "LIVE_OPERATION"
  ) {
    const checkedAt = new Date().toISOString();
    await Promise.allSettled(providers.map((provider) => this.prisma.utilityProvider.update({
      where: { id: provider.id },
      data: {
        metadata: {
          ...this.jsonObject(provider.metadata),
          accelerateIpReadiness: { status, checkedAt, safeNote, source }
        } as Prisma.InputJsonObject
      }
    })));
  }

  private isAccelerateIpDenialResult(purchase: UtilityPurchaseResult) {
    const metadata = this.jsonObject(purchase.metadata as Prisma.JsonValue | undefined);
    return this.isAccelerateIpDenialStatus(purchase.providerStatus) || metadata.error === "provider_ip_allowlist_required";
  }

  private isAccelerateIpDenialStatus(providerStatus: string | null | undefined) {
    return typeof providerStatus === "string" && ACCELERATE_IP_DENIAL_STATUSES.includes(providerStatus);
  }

  private assertLiveCustomerPurchaseGate(serviceType: UtilityServiceType) {
    const mode = this.providerModeForService(serviceType);
    if (
      (mode === "accelerate" || mode === "paybeta") &&
      this.utilitiesPlatformEnabled() &&
      (mode !== "accelerate" || this.accelerateIntegrationEnabled()) &&
      !this.flagValue("UTILITIES_TEST_MODE", true) &&
      !this.customerUtilityPurchasesFlagEnabled()
    ) {
      throw new ForbiddenException("Customer Utilities remain closed until the Customer purchase gate is enabled.");
    }
  }

  private optionalFlagValue(key: string): boolean | undefined {
    const value = this.config.get<unknown>(key);
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return false;
  }

  private assertAccelerateLiveRequestAllowed(
    resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>>,
    utilityProvider: ReturnType<UtilitiesService["activeUtilityProvider"]>
  ) {
    if (utilityProvider.mode !== "accelerate" || utilityProvider.testMode) return;
    if (
      (resolved.provider.type === UtilityServiceType.DATA || resolved.provider.type === UtilityServiceType.CABLE_TV) &&
      (!resolved.product?.code || resolved.product.code.startsWith("DEMO_"))
    ) {
      throw new BadRequestException("This utility product is currently unavailable.");
    }
  }

  private utilityMetadata(
    mode: string,
    testMode: boolean,
    paymentMethod?: string,
    meterType?: string,
    recipientAddress?: string,
    recipientVerified?: boolean
  ): Prisma.InputJsonObject {
    return {
      mode,
      testMode,
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(meterType ? { meterType } : {}),
      ...(recipientAddress ? { recipientAddress } : {}),
      ...(recipientVerified !== undefined ? { recipientVerified } : {})
    };
  }

  private mergeMetadata(currentMetadata: Prisma.JsonValue | null | undefined, metadata: Record<string, unknown> | undefined): Prisma.InputJsonObject {
    return {
      ...(this.jsonObject(currentMetadata)),
      ...Object.fromEntries(Object.entries(metadata ?? {}).filter(([, value]) => value !== undefined))
    } as Prisma.InputJsonObject;
  }

  private serviceLabel(type: UtilityServiceType) {
    return type === UtilityServiceType.CABLE_TV ? "Cable TV" : type.charAt(0) + type.slice(1).toLowerCase();
  }

  private transactionProviderMode(metadata: Prisma.JsonValue | null) {
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      const mode = (metadata as Record<string, unknown>).mode;
      if (typeof mode === "string") return mode;
    }
    return "mock";
  }

  private async findIdempotentWalletUtilityTransaction(customerId: string, idempotencyKey?: string) {
    if (!idempotencyKey) return null;
    const ledger = await this.prisma.customerWalletLedgerEntry.findUnique({
      where: { idempotencyKey: this.walletDebitIdempotencyKey(customerId, idempotencyKey) }
    });
    if (!ledger?.sourceId) return null;
    return this.prisma.utilityTransaction.findFirst({
      where: { id: ledger.sourceId, customerId },
      include: this.customerInclude()
    });
  }

  private walletDebitIdempotencyKey(customerId: string, key: string) {
    const safeKey = key.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);
    return `utility:${customerId}:${safeKey}`;
  }

  private walletAmountFromKobo(amountKobo: number) {
    return new Prisma.Decimal(amountKobo).div(100).toDecimalPlaces(2);
  }

  private stringValue(key: string, fallback = ""): string {
    const value = this.config.get<unknown>(key);
    return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : fallback;
  }

  private flagValue(key: string, fallback: boolean): boolean {
    return this.optionalFlagValue(key) ?? fallback;
  }

  private jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private publicProvider(provider: { id: string; type: UtilityServiceType; name: string; code: string }) {
    return { id: provider.id, type: provider.type, name: provider.name, code: provider.code };
  }

  private publicProduct(product: { id: string; providerId: string; type: UtilityServiceType; name: string; code: string; amountKobo: number | null; minAmountKobo: number | null; maxAmountKobo: number | null }) {
    return {
      id: product.id,
      providerId: product.providerId,
      type: product.type,
      name: product.name,
      code: product.code,
      amountKobo: product.amountKobo,
      minAmountKobo: product.minAmountKobo,
      maxAmountKobo: product.maxAmountKobo
    };
  }

  private customerInclude() {
    return { provider: true, product: true };
  }

  private adminInclude(includeDetail: boolean) {
    return {
      provider: true,
      product: true,
      customer: { select: { id: true, user: { select: { id: true, fullName: true, phoneNumber: includeDetail, email: includeDetail } } } }
    };
  }

  private customerTransaction(transaction: Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["customerInclude"]> }>, list = false) {
    const metadata = this.jsonObject(transaction.metadata);
    return {
      id: transaction.id,
      reference: transaction.reference,
      serviceType: transaction.serviceType,
      provider: this.publicProvider(transaction.provider),
      product: transaction.product ? this.publicProduct(transaction.product) : null,
      amountKobo: transaction.amountKobo,
      convenienceFeeKobo: transaction.convenienceFeeKobo,
      totalKobo: transaction.totalKobo,
      recipient: list ? this.maskRecipient(transaction.recipient) : transaction.recipient,
      recipientName: transaction.recipientName,
      status: transaction.status,
      providerStatus: transaction.providerStatus,
      mockToken: transaction.mockToken,
      token: !list && transaction.serviceType === UtilityServiceType.ELECTRICITY && transaction.status === UtilityTransactionStatus.SUCCESSFUL ? transaction.mockToken : undefined,
      units: typeof metadata.units === "string" ? metadata.units : undefined,
      providerTransactionId: typeof metadata.transactionId === "string" ? metadata.transactionId : undefined,
      meterType: metadata.meterType === "PREPAID" || metadata.meterType === "POSTPAID" ? metadata.meterType : undefined,
      recipientAddress: !list && typeof metadata.recipientAddress === "string" ? metadata.recipientAddress : undefined,
      customerNote: transaction.customerNote,
      failureReason: transaction.failureReason,
      providerMode: typeof metadata.mode === "string" ? metadata.mode : "mock",
      paymentMethod: typeof metadata.paymentMethod === "string" ? metadata.paymentMethod : undefined,
      walletDebitReference: typeof metadata.walletDebitReference === "string" ? metadata.walletDebitReference : undefined,
      walletDebitStatus: typeof metadata.walletDebitStatus === "string" ? metadata.walletDebitStatus : undefined,
      walletReversalReference: typeof metadata.walletReversalReference === "string" ? metadata.walletReversalReference : undefined,
      walletReversalStatus: typeof metadata.walletReversalStatus === "string" ? metadata.walletReversalStatus : undefined,
      testMode: typeof metadata.testMode === "boolean" ? metadata.testMode : true,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt
    };
  }

  private adminTransaction(transaction: Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>, list = false) {
    const metadata = this.jsonObject(transaction.metadata);
    return {
      id: transaction.id,
      reference: transaction.reference,
      serviceType: transaction.serviceType,
      provider: this.publicProvider(transaction.provider),
      product: transaction.product ? this.publicProduct(transaction.product) : null,
      amountKobo: transaction.amountKobo,
      convenienceFeeKobo: transaction.convenienceFeeKobo,
      totalKobo: transaction.totalKobo,
      recipient: this.maskRecipient(transaction.recipient),
      recipientName: list ? undefined : transaction.recipientName,
      status: transaction.status,
      providerStatus: transaction.providerStatus,
      providerReference: list ? undefined : transaction.providerReference,
      mockToken: list ? undefined : transaction.mockToken,
      customerNote: transaction.customerNote,
      failureReason: transaction.failureReason,
      metadata: list ? undefined : transaction.metadata,
      providerSafeNote: typeof metadata.providerSafeNote === "string" ? metadata.providerSafeNote : undefined,
      customer: {
        id: transaction.customer.id,
        fullName: transaction.customer.user.fullName,
        phoneNumber: transaction.customer.user.phoneNumber,
        email: transaction.customer.user.email
      },
      providerMode: typeof metadata.mode === "string" ? metadata.mode : "mock",
      paymentMethod: typeof metadata.paymentMethod === "string" ? metadata.paymentMethod : undefined,
      walletDebitReference: typeof metadata.walletDebitReference === "string" ? metadata.walletDebitReference : undefined,
      walletDebitStatus: typeof metadata.walletDebitStatus === "string" ? metadata.walletDebitStatus : undefined,
      walletReversalReference: typeof metadata.walletReversalReference === "string" ? metadata.walletReversalReference : undefined,
      walletReversalStatus: typeof metadata.walletReversalStatus === "string" ? metadata.walletReversalStatus : undefined,
      testMode: typeof metadata.testMode === "boolean" ? metadata.testMode : true,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt
    };
  }

  private maskRecipient(value: string) {
    const trimmed = value.trim();
    if (trimmed.startsWith("+234") && trimmed.length >= 11) {
      return `${trimmed.slice(0, 7)}***${trimmed.slice(-4)}`;
    }
    if (trimmed.length <= 6) return "***";
    return `${trimmed.slice(0, 3)}***${trimmed.slice(-4)}`;
  }
}
