import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentPurpose, PaymentStatus, Prisma, WalletLedgerDirection, WalletLedgerEntryStatus, WalletLedgerEntryType, WalletStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWalletAdjustmentDto } from "./dto/create-wallet-adjustment.dto";
import { ListAdminWalletsQueryDto } from "./dto/list-admin-wallets-query.dto";
import { ListWalletLedgerQueryDto } from "./dto/list-wallet-ledger-query.dto";

const WALLET_INCLUDE = {
  customer: { select: { id: true, user: { select: { id: true, fullName: true, phoneNumber: true, email: true } } } }
} satisfies Prisma.CustomerWalletInclude;

const LEDGER_INCLUDE = {
  createdByAdmin: { select: { id: true, fullName: true, email: true, adminRole: true } }
} satisfies Prisma.CustomerWalletLedgerEntryInclude;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  async customerWallet(userId: string) {
    const customer = await this.requireCustomer(userId);
    const wallet = await this.ensureWallet(customer.id);
    return this.toWalletSummary(wallet);
  }

  async customerLedger(userId: string, query: ListWalletLedgerQueryDto) {
    const customer = await this.requireCustomer(userId);
    const wallet = await this.ensureWallet(customer.id);
    const entries = await this.prisma.customerWalletLedgerEntry.findMany({
      where: {
        walletId: wallet.id,
        ...(query.entryType ? { entryType: query.entryType } : {}),
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });

    return {
      wallet: this.toWalletSummary(wallet),
      items: entries.map((entry) => this.toCustomerLedgerEntry(entry))
    };
  }

  async adminList(query: ListAdminWalletsQueryDto) {
    const where: Prisma.CustomerWalletWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? {
        OR: [
          { customer: { user: { fullName: { contains: query.search, mode: "insensitive" } } } },
          { customer: { user: { phoneNumber: { contains: query.search } } } },
          { customer: { user: { email: { contains: query.search, mode: "insensitive" } } } }
        ]
      } : {})
    };

    const [items, activeWallets, suspendedWallets, closedWallets] = await Promise.all([
      this.prisma.customerWallet.findMany({
        where,
        include: WALLET_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      this.prisma.customerWallet.count({ where: { status: WalletStatus.ACTIVE } }),
      this.prisma.customerWallet.count({ where: { status: WalletStatus.SUSPENDED } }),
      this.prisma.customerWallet.count({ where: { status: WalletStatus.CLOSED } })
    ]);

    return {
      summary: {
        totalWallets: activeWallets + suspendedWallets + closedWallets,
        activeWallets,
        suspendedWallets,
        closedWallets,
        totalAvailableBalance: this.sum(items.map((wallet) => wallet.availableBalance))
      },
      items: items.map((wallet) => this.toAdminWallet(wallet))
    };
  }

  async adminDetail(walletId: string) {
    const wallet = await this.prisma.customerWallet.findUnique({
      where: { id: walletId },
      include: {
        ...WALLET_INCLUDE,
        ledgerEntries: {
          include: LEDGER_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });
    if (!wallet) throw new NotFoundException("Customer wallet not found");

    return {
      ...this.toAdminWallet(wallet),
      ledgerEntries: wallet.ledgerEntries.map((entry) => this.toAdminLedgerEntry(entry))
    };
  }

  async adminTopUps() {
    const payments = await this.prisma.payment.findMany({
      where: { paymentPurpose: PaymentPurpose.WALLET_TOP_UP },
      include: { customer: { select: { id: true, user: { select: { id: true, fullName: true, phoneNumber: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    const ledgerIds = payments
      .map((payment) => payment.walletLedgerEntryId)
      .filter((id): id is string => Boolean(id));
    const ledgers = ledgerIds.length
      ? await this.prisma.customerWalletLedgerEntry.findMany({ where: { id: { in: ledgerIds } } })
      : [];
    const ledgerById = new Map(ledgers.map((entry) => [entry.id, entry]));

    return {
      items: payments.map((payment) => this.toAdminTopUp(payment, payment.walletLedgerEntryId ? ledgerById.get(payment.walletLedgerEntryId) : undefined))
    };
  }

  async adminCreateAdjustment(adminUserId: string, walletId: string, dto: CreateWalletAdjustmentDto) {
    const amount = this.toMoneyDecimal(dto.amount);
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.idempotencyKey) {
        const existing = await tx.customerWalletLedgerEntry.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: { wallet: { include: WALLET_INCLUDE }, createdByAdmin: { select: { id: true, fullName: true, email: true, adminRole: true } } }
        });
        if (existing) {
          return { wallet: existing.wallet, entry: existing, duplicate: true };
        }
      }

      const wallet = await tx.customerWallet.findUnique({
        where: { id: walletId },
        include: WALLET_INCLUDE
      });
      if (!wallet) throw new NotFoundException("Customer wallet not found");
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException("Only active wallets can receive manual adjustments");
      }

      const balanceBefore = wallet.availableBalance;
      if (dto.direction === WalletLedgerDirection.DEBIT && balanceBefore.lessThan(amount)) {
        throw new BadRequestException("Wallet balance is not sufficient for this debit adjustment");
      }
      const balanceAfter = dto.direction === WalletLedgerDirection.CREDIT ? balanceBefore.add(amount) : balanceBefore.sub(amount);
      const now = new Date();

      const updatedWallet = await tx.customerWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          ledgerBalance: balanceAfter,
          lastActivityAt: now
        },
        include: WALLET_INCLUDE
      });

      const entry = await tx.customerWalletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          customerId: wallet.customerId,
          entryType: WalletLedgerEntryType.ADMIN_ADJUSTMENT,
          direction: dto.direction,
          status: WalletLedgerEntryStatus.POSTED,
          amount,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter,
          reference: this.reference(),
          idempotencyKey: dto.idempotencyKey || null,
          sourceType: "ADMIN_ADJUSTMENT",
          description: dto.reason,
          ...(dto.internalNote ? { metadata: { internalNote: dto.internalNote } as Prisma.InputJsonValue } : {}),
          createdByAdminId: adminUserId,
          postedAt: now
        },
        include: LEDGER_INCLUDE
      });

      return { wallet: updatedWallet, entry, duplicate: false };
    });

    if (!result.duplicate) {
      await this.audit.record(adminUserId, "wallet.admin_adjustment.created", "CustomerWallet", walletId, {
        customerId: result.wallet.customerId,
        ledgerEntryId: result.entry.id,
        direction: result.entry.direction,
        amount: result.entry.amount.toFixed(2),
        reference: result.entry.reference
      });
    }

    return {
      wallet: this.toAdminWallet(result.wallet),
      entry: this.toAdminLedgerEntry(result.entry),
      duplicate: result.duplicate
    };
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId }, select: { id: true, userId: true } });
    if (!customer) throw new NotFoundException("Customer profile not found");
    return customer;
  }

  private ensureWallet(customerId: string) {
    return this.prisma.customerWallet.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
      include: WALLET_INCLUDE
    });
  }

  private toMoneyDecimal(amount: number) {
    const decimal = new Prisma.Decimal(amount).toDecimalPlaces(2);
    if (decimal.lessThanOrEqualTo(0)) throw new BadRequestException("Wallet amount must be greater than zero");
    return decimal;
  }

  private sum(values: Prisma.Decimal[]) {
    return values.reduce((total, value) => total.add(value), new Prisma.Decimal(0));
  }

  private reference() {
    return `KGO-WALLET-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  private toWalletSummary(wallet: Prisma.CustomerWalletGetPayload<{ include: typeof WALLET_INCLUDE }>) {
    return {
      id: wallet.id,
      customerId: wallet.customerId,
      currency: wallet.currency,
      availableBalance: wallet.availableBalance,
      ledgerBalance: wallet.ledgerBalance,
      status: wallet.status,
      lastActivityAt: wallet.lastActivityAt?.toISOString() ?? null,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString()
    };
  }

  private toAdminWallet(wallet: Prisma.CustomerWalletGetPayload<{ include: typeof WALLET_INCLUDE }>) {
    return {
      ...this.toWalletSummary(wallet),
      customer: wallet.customer
    };
  }

  private toCustomerLedgerEntry(entry: Prisma.CustomerWalletLedgerEntryGetPayload<object>) {
    return {
      id: entry.id,
      entryType: entry.entryType,
      direction: entry.direction,
      status: entry.status,
      amount: entry.amount,
      currency: entry.currency,
      balanceAfter: entry.balanceAfter,
      reference: entry.reference,
      sourceType: entry.sourceType,
      description: entry.description,
      postedAt: entry.postedAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString()
    };
  }

  private toAdminLedgerEntry(entry: Prisma.CustomerWalletLedgerEntryGetPayload<{ include: typeof LEDGER_INCLUDE }>) {
    return {
      ...this.toCustomerLedgerEntry(entry),
      walletId: entry.walletId,
      customerId: entry.customerId,
      balanceBefore: entry.balanceBefore,
      sourceId: entry.sourceId,
      metadata: entry.metadata,
      createdByAdmin: entry.createdByAdmin,
      reversedAt: entry.reversedAt?.toISOString() ?? null,
      updatedAt: entry.updatedAt.toISOString()
    };
  }

  private toAdminTopUp(
    payment: Prisma.PaymentGetPayload<{ include: { customer: { select: { id: true; user: { select: { id: true; fullName: true; phoneNumber: true; email: true } } } } } }>,
    ledger?: Prisma.CustomerWalletLedgerEntryGetPayload<object>
  ) {
    return {
      id: payment.id,
      customer: payment.customer,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.transactionReference,
      status: payment.paymentStatus,
      provider: payment.gateway,
      walletLedgerEntryId: payment.walletLedgerEntryId,
      ledgerStatus: ledger?.status ?? null,
      createdAt: payment.createdAt.toISOString(),
      verifiedAt: payment.paidAt?.toISOString() ?? ledger?.postedAt?.toISOString() ?? null,
      safeFailureReason: payment.paymentStatus === PaymentStatus.FAILED
        ? "Wallet top-up failed during provider initialization or verification. Review provider dashboard and backend logs; no wallet credit was posted."
        : null
    };
  }
}
