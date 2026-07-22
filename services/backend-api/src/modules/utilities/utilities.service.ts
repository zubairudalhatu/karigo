import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
import { AccelerateUtilityProvider } from "./providers/accelerate-utility.provider";
import { MockUtilityProvider } from "./providers/mock-utility.provider";
import { UtilityProviderClient, UtilityPurchaseResult } from "./providers/utility-provider.interface";

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
const UTILITY_WALLET_SOURCE_TYPE = "UTILITY_TRANSACTION";
const UTILITY_WALLET_REVERSAL_SOURCE_TYPE = "UTILITY_TRANSACTION_REVERSAL";

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mockProvider: MockUtilityProvider,
    private readonly accelerateProvider: AccelerateUtilityProvider,
    private readonly audit: AdminAuditService
  ) {}

  listProviders(query: UtilityProvidersQueryDto) {
    return this.prisma.utilityProvider.findMany({
      where: { isActive: true, ...(query.type ? { type: query.type } : {}) },
      select: { id: true, type: true, name: true, code: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  }

  listProducts(query: UtilityProductsQueryDto) {
    return this.prisma.utilityProduct.findMany({
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
        amountKobo: true,
        minAmountKobo: true,
        maxAmountKobo: true,
        provider: { select: { id: true, name: true, code: true, type: true } }
      },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  }

  async quote(userId: string, dto: UtilityQuoteDto) {
    const customer = await this.requireCustomer(userId);
    const utilityProvider = this.activeUtilityProvider();
    const resolved = await this.resolveRequest(dto, utilityProvider.client);
    const providerQuote = await utilityProvider.client.quote({
      serviceType: resolved.provider.type,
      providerCode: resolved.provider.code,
      productCode: resolved.product?.code,
      amountKobo: resolved.amountKobo,
      recipient: resolved.recipient,
      recipientName: resolved.recipientName
    });
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
      providerStatus: providerQuote.providerStatus,
      customerNote: providerQuote.customerNote,
      providerMode: utilityProvider.mode,
      testMode: utilityProvider.testMode,
      createdAt: new Date().toISOString()
    };
  }

  async createTransaction(userId: string, dto: CreateUtilityTransactionDto) {
    const customer = await this.requireCustomer(userId);
    const utilityProvider = this.activeUtilityProvider();
    if (this.walletUtilityPaymentEnabled(utilityProvider)) {
      const existing = await this.findIdempotentWalletUtilityTransaction(customer.id, dto.idempotencyKey);
      if (existing) return this.customerTransaction(existing);
    }
    const resolved = await this.resolveRequest(dto, utilityProvider.client);
    const reference = await this.uniqueReference();
    if (this.walletUtilityPaymentEnabled(utilityProvider)) {
      return this.createWalletFundedTransaction(customer.id, dto, resolved, reference, utilityProvider);
    }
    if (utilityProvider.mode === "accelerate" && !utilityProvider.testMode) {
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
        metadata: this.utilityMetadata(utilityProvider.mode, utilityProvider.testMode)
      },
      include: this.customerInclude()
    });
    const purchase = await utilityProvider.client.purchase({
      serviceType: resolved.provider.type,
      providerCode: resolved.provider.code,
      productCode: resolved.product?.code,
      amountKobo: resolved.amountKobo,
      recipient: resolved.recipient,
      recipientName: resolved.recipientName,
      reference,
      totalKobo: resolved.totalKobo
    });
    const updated = await this.applyProviderResult(transaction.id, purchase, this.customerInclude(), transaction.metadata);
    return this.customerTransaction(updated);
  }

  private async createWalletFundedTransaction(
    customerId: string,
    dto: CreateUtilityTransactionDto,
    resolved: Awaited<ReturnType<UtilitiesService["resolveRequest"]>>,
    reference: string,
    utilityProvider: ReturnType<UtilitiesService["activeUtilityProvider"]>
  ) {
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
          metadata: this.utilityMetadata(utilityProvider.mode, utilityProvider.testMode, "WALLET")
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
        productCode: resolved.product?.code,
        amountKobo: resolved.amountKobo,
        recipient: resolved.recipient,
        recipientName: resolved.recipientName,
        reference,
        totalKobo: resolved.totalKobo
      });
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
    if (TERMINAL_STATUSES.includes(transaction.status)) return this.adminTransaction(transaction);

    const utilityProvider = this.providerForMode(this.transactionProviderMode(transaction.metadata));
    const purchase = await utilityProvider.client.checkStatus(transaction.providerReference ?? transaction.reference);
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

  private async reverseWalletDebitIfNeeded(transactionId: string, reason: string, adminInclude = false) {
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
            status: UtilityTransactionStatus.FAILED,
            customerNote: "Utility payment failed. Your wallet has been reversed.",
            failureReason: reason,
            metadata: this.mergeMetadata(transaction.metadata, {
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
          status: UtilityTransactionStatus.FAILED,
          customerNote: "Utility payment failed. Your wallet has been reversed.",
          failureReason: reason,
          metadata: this.mergeMetadata(transaction.metadata, {
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
    return this.customerTransaction(transaction);
  }

  async cancel(userId: string, transactionId: string) {
    const customer = await this.requireCustomer(userId);
    const transaction = await this.prisma.utilityTransaction.findFirst({
      where: { id: transactionId, customerId: customer.id },
      include: this.customerInclude()
    });
    if (!transaction) throw new NotFoundException("Utility transaction not found");
    if (TERMINAL_STATUSES.includes(transaction.status)) {
      throw new BadRequestException("This utility transaction can no longer be cancelled.");
    }
    const updated = await this.prisma.utilityTransaction.update({
      where: { id: transaction.id },
      data: {
        status: UtilityTransactionStatus.CANCELLED,
        providerStatus: "MOCK_CANCELLED",
        failureReason: "Cancelled by customer before fulfilment.",
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

    const product = dto.productId ? await this.prisma.utilityProduct.findFirst({
      where: { id: dto.productId, providerId: provider.id, type: provider.type, isActive: true }
    }) : null;
    if (dto.productId && !product) throw new NotFoundException("Utility product not found");

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
      recipientName: dto.recipientName ?? validation.recipientName
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

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId }, select: { id: true } });
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

  private activeUtilityProvider() {
    if (this.accelerateCustomerPurchasesEnabled()) {
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
    return this.providerForMode("mock");
  }

  private providerForMode(mode: string) {
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

  private accelerateCustomerPurchasesEnabled() {
    return this.stringValue("UTILITIES_PROVIDER", "mock") === "accelerate" &&
      this.flagValue("UTILITIES_ENABLED", false) &&
      this.customerUtilityPurchasesFlagEnabled() &&
      this.flagValue("ACCELERATE_ENABLED", false);
  }

  private walletUtilityPaymentEnabled(utilityProvider: ReturnType<UtilitiesService["activeUtilityProvider"]>) {
    return utilityProvider.mode === "accelerate" &&
      !utilityProvider.testMode &&
      this.customerUtilityPurchasesFlagEnabled() &&
      this.flagValue("UTILITIES_WALLET_PAYMENT_ENABLED", false) &&
      this.flagValue("UTILITIES_LIVE_FULFILLMENT_ENABLED", false);
  }

  private customerUtilityPurchasesFlagEnabled() {
    return this.flagValue("UTILITIES_CUSTOMER_PURCHASE_ENABLED", false) ||
      this.flagValue("UTILITIES_CUSTOMER_PURCHASES_ENABLED", false);
  }

  private utilityMetadata(mode: string, testMode: boolean, paymentMethod?: string): Prisma.InputJsonObject {
    return { mode, testMode, ...(paymentMethod ? { paymentMethod } : {}) };
  }

  private mergeMetadata(currentMetadata: Prisma.JsonValue | null | undefined, metadata: Record<string, unknown> | undefined): Prisma.InputJsonObject {
    return {
      ...(this.jsonObject(currentMetadata)),
      ...(metadata ?? {})
    } as Prisma.InputJsonObject;
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
    const value = this.config.get<unknown>(key);
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return fallback;
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
