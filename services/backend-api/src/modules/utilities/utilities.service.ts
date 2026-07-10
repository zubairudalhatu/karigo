import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUtilityTransactionDto, UtilityQuoteDto } from "./dto/customer-utility.dto";
import { ListUtilityTransactionsQueryDto } from "./dto/list-utility-transactions-query.dto";
import { UtilityProductsQueryDto, UtilityProvidersQueryDto } from "./dto/utility-catalogue-query.dto";
import { UpdateUtilityTransactionStatusDto } from "./dto/update-utility-status.dto";
import { MockUtilityProvider } from "./providers/mock-utility.provider";

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

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mockProvider: MockUtilityProvider,
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
    const resolved = await this.resolveRequest(dto);
    const providerQuote = await this.mockProvider.quote({
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
      testMode: true,
      createdAt: new Date().toISOString()
    };
  }

  async createTransaction(userId: string, dto: CreateUtilityTransactionDto) {
    const customer = await this.requireCustomer(userId);
    const resolved = await this.resolveRequest(dto);
    const reference = await this.uniqueReference();
    const purchase = await this.mockProvider.purchase({
      serviceType: resolved.provider.type,
      providerCode: resolved.provider.code,
      productCode: resolved.product?.code,
      amountKobo: resolved.amountKobo,
      recipient: resolved.recipient,
      recipientName: resolved.recipientName,
      reference,
      totalKobo: resolved.totalKobo
    });
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
        status: purchase.status,
        providerStatus: purchase.providerStatus,
        providerReference: purchase.providerReference,
        mockToken: purchase.mockToken,
        customerNote: purchase.customerNote ?? dto.customerNote,
        failureReason: purchase.failureReason,
        metadata: {
          mode: "mock",
          testMode: true,
          ...(purchase.metadata ?? {})
        },
        completedAt: purchase.status === UtilityTransactionStatus.SUCCESSFUL ? new Date() : undefined
      },
      include: this.customerInclude()
    });
    return this.customerTransaction(transaction);
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
    return { totalTransactions: total, pending, successful, failed, totalTestValueKobo: totalValue._sum.totalKobo ?? 0 };
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

  private async resolveRequest(dto: UtilityQuoteDto) {
    const provider = await this.prisma.utilityProvider.findFirst({
      where: { id: dto.providerId, type: dto.serviceType, isActive: true }
    });
    if (!provider) throw new NotFoundException("Utility provider not found");

    const product = dto.productId ? await this.prisma.utilityProduct.findFirst({
      where: { id: dto.productId, providerId: provider.id, type: provider.type, isActive: true }
    }) : null;
    if (dto.productId && !product) throw new NotFoundException("Utility product not found");

    const amountKobo = this.resolveAmount(provider.type, product, dto.amountKobo);
    const validation = await this.mockProvider.validateRecipient(provider.type, dto.recipient);
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
      testMode: true,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt
    };
  }

  private adminTransaction(transaction: Prisma.UtilityTransactionGetPayload<{ include: ReturnType<UtilitiesService["adminInclude"]> }>, list = false) {
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
      testMode: true,
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
