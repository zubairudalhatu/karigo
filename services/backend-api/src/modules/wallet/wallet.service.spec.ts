import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma, WalletLedgerDirection, WalletLedgerEntryStatus, WalletLedgerEntryType, WalletStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WalletService } from "./wallet.service";

const now = new Date("2026-07-12T12:00:00.000Z");
const customer = { id: "customer-1", userId: "customer-user-1" };
const wallet = {
  id: "wallet-1",
  customerId: customer.id,
  currency: "NGN",
  availableBalance: new Prisma.Decimal(2500),
  ledgerBalance: new Prisma.Decimal(2500),
  status: WalletStatus.ACTIVE,
  lastActivityAt: now,
  createdAt: now,
  updatedAt: now,
  customer: {
    id: customer.id,
    user: {
      id: customer.userId,
      fullName: "Demo Customer",
      phoneNumber: "08000000001",
      email: "customer@karigo.local"
    }
  }
};
const ledgerEntry = {
  id: "entry-1",
  walletId: wallet.id,
  customerId: customer.id,
  entryType: WalletLedgerEntryType.ADMIN_ADJUSTMENT,
  direction: WalletLedgerDirection.CREDIT,
  status: WalletLedgerEntryStatus.POSTED,
  amount: new Prisma.Decimal(1000),
  currency: "NGN",
  balanceBefore: new Prisma.Decimal(2500),
  balanceAfter: new Prisma.Decimal(3500),
  reference: "KGO-WALLET-REF",
  idempotencyKey: "idem-1",
  sourceType: "ADMIN_ADJUSTMENT",
  sourceId: null,
  description: "Pilot wallet credit",
  metadata: { internalNote: "Internal only" },
  createdByAdminId: "admin-1",
  postedAt: now,
  reversedAt: null,
  createdAt: now,
  updatedAt: now,
  createdByAdmin: { id: "admin-1", fullName: "Finance Admin", email: "admin@karigo.local", adminRole: "FINANCE_OFFICER" }
};

describe("WalletService", () => {
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    customerWallet: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    customerWalletLedgerEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new WalletService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customerProfile.findUnique.mockResolvedValue(customer);
    prisma.customerWallet.upsert.mockResolvedValue(wallet);
    prisma.customerWallet.count.mockResolvedValue(1);
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    audit.record.mockResolvedValue({});
  });

  it("ensures a wallet for the authenticated customer without exposing another customer", async () => {
    const result = await service.customerWallet(customer.userId);

    expect(prisma.customerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: customer.userId },
      select: { id: true, userId: true }
    });
    expect(prisma.customerWallet.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: customer.id },
      create: { customerId: customer.id }
    }));
    expect(result).toMatchObject({
      id: wallet.id,
      customerId: customer.id,
      status: WalletStatus.ACTIVE
    });
  });

  it("rejects wallet access when the authenticated user has no customer profile", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue(null);

    await expect(service.customerWallet("not-a-customer")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.customerWallet.upsert).not.toHaveBeenCalled();
  });

  it("returns customer ledger entries without admin metadata", async () => {
    prisma.customerWalletLedgerEntry.findMany.mockResolvedValue([ledgerEntry]);

    const result = await service.customerLedger(customer.userId, { entryType: WalletLedgerEntryType.ADMIN_ADJUSTMENT });

    expect(prisma.customerWalletLedgerEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        walletId: wallet.id,
        entryType: WalletLedgerEntryType.ADMIN_ADJUSTMENT
      }
    }));
    expect(result.items[0]).toMatchObject({
      id: ledgerEntry.id,
      amount: ledgerEntry.amount,
      reference: ledgerEntry.reference
    });
    expect(result.items[0]).not.toHaveProperty("metadata");
    expect(result.items[0]).not.toHaveProperty("createdByAdmin");
  });

  it("creates a controlled admin credit adjustment and records an audit trail", async () => {
    prisma.customerWalletLedgerEntry.findUnique.mockResolvedValue(null);
    prisma.customerWallet.findUnique.mockResolvedValue(wallet);
    prisma.customerWallet.update.mockResolvedValue({
      ...wallet,
      availableBalance: new Prisma.Decimal(3500),
      ledgerBalance: new Prisma.Decimal(3500)
    });
    prisma.customerWalletLedgerEntry.create.mockResolvedValue(ledgerEntry);

    const result = await service.adminCreateAdjustment("admin-1", wallet.id, {
      direction: WalletLedgerDirection.CREDIT,
      amount: 1000,
      reason: "Pilot wallet credit",
      idempotencyKey: "idem-1",
      internalNote: "Internal only"
    });

    expect(prisma.customerWallet.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: wallet.id },
      data: expect.objectContaining({
        availableBalance: new Prisma.Decimal(3500),
        ledgerBalance: new Prisma.Decimal(3500)
      })
    }));
    expect(prisma.customerWalletLedgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        entryType: WalletLedgerEntryType.ADMIN_ADJUSTMENT,
        direction: WalletLedgerDirection.CREDIT,
        amount: new Prisma.Decimal(1000),
        createdByAdminId: "admin-1"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-1", "wallet.admin_adjustment.created", "CustomerWallet", wallet.id, expect.objectContaining({
      customerId: customer.id,
      ledgerEntryId: ledgerEntry.id,
      direction: WalletLedgerDirection.CREDIT,
      amount: "1000.00"
    }));
    expect(result.duplicate).toBe(false);
  });

  it("blocks debit adjustments that would overdraw the wallet", async () => {
    prisma.customerWalletLedgerEntry.findUnique.mockResolvedValue(null);
    prisma.customerWallet.findUnique.mockResolvedValue({ ...wallet, availableBalance: new Prisma.Decimal(100) });

    await expect(service.adminCreateAdjustment("admin-1", wallet.id, {
      direction: WalletLedgerDirection.DEBIT,
      amount: 1000,
      reason: "Correction"
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.customerWallet.update).not.toHaveBeenCalled();
    expect(prisma.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it("returns existing ledger entry for duplicate idempotency keys without changing balance again", async () => {
    prisma.customerWalletLedgerEntry.findUnique.mockResolvedValue({ ...ledgerEntry, wallet });

    const result = await service.adminCreateAdjustment("admin-1", wallet.id, {
      direction: WalletLedgerDirection.CREDIT,
      amount: 1000,
      reason: "Pilot wallet credit",
      idempotencyKey: "idem-1"
    });

    expect(result.duplicate).toBe(true);
    expect(prisma.customerWallet.update).not.toHaveBeenCalled();
    expect(prisma.customerWalletLedgerEntry.create).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
