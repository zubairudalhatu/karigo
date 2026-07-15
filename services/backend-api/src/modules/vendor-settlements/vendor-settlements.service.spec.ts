import { NotFoundException } from "@nestjs/common";
import { Prisma, SettlementStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorSettlementsService } from "./vendor-settlements.service";

describe("VendorSettlementsService", () => {
  const prisma = {
    vendor: { findFirst: jest.fn() },
    vendorSettlement: { findMany: jest.fn() }
  };
  const service = new VendorSettlementsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("queries only settlements belonging to the authenticated vendor", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-a" });
    prisma.vendorSettlement.findMany.mockResolvedValue([]);

    await service.list("vendor-user-a", {});

    expect(prisma.vendor.findFirst).toHaveBeenCalledWith({
      where: { userId: "vendor-user-a", deletedAt: null },
      select: { id: true }
    });
    expect(prisma.vendorSettlement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { vendorId: "vendor-a" }
    }));
  });

  it("applies safe status filtering for vendor settlements", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-a" });
    prisma.vendorSettlement.findMany.mockResolvedValue([]);

    await service.list("vendor-user-a", { status: SettlementStatus.PAID as never });

    expect(prisma.vendorSettlement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { vendorId: "vendor-a", settlementStatus: SettlementStatus.PAID }
    }));
  });

  it("returns read-only settlement rows and summary values", async () => {
    prisma.vendor.findFirst.mockResolvedValue({ id: "vendor-a" });
    prisma.vendorSettlement.findMany.mockResolvedValue([
      {
        id: "settlement-1",
        grossAmount: new Prisma.Decimal(5000),
        commissionRate: new Prisma.Decimal(15),
        commissionAmount: new Prisma.Decimal(750),
        netAmount: new Prisma.Decimal(4250),
        settlementStatus: SettlementStatus.PENDING,
        paidAt: null,
        paymentReference: null,
        createdAt: new Date("2026-07-04T10:00:00.000Z"),
        order: {
          orderNumber: "KGO-1",
          completedAt: new Date("2026-07-04T09:00:00.000Z"),
          deliveryFee: new Prisma.Decimal(1000)
        }
      },
      {
        id: "settlement-2",
        grossAmount: new Prisma.Decimal(3000),
        commissionRate: new Prisma.Decimal(15),
        commissionAmount: new Prisma.Decimal(450),
        netAmount: new Prisma.Decimal(2550),
        settlementStatus: SettlementStatus.PAID,
        paidAt: new Date("2026-07-04T11:00:00.000Z"),
        paymentReference: "PAYOUT-1",
        createdAt: new Date("2026-07-04T10:30:00.000Z"),
        order: {
          orderNumber: "KGO-2",
          completedAt: new Date("2026-07-04T09:30:00.000Z"),
          deliveryFee: new Prisma.Decimal(1000)
        }
      }
    ]);

    const result = await service.list("vendor-user-a", {});

    expect(result.summary.totalSettlements).toBe(2);
    expect(new Prisma.Decimal(result.summary.pendingPayout).toNumber()).toBe(4250);
    expect(new Prisma.Decimal(result.summary.paidOut).toNumber()).toBe(2550);
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: "settlement-1",
      orderNumber: "KGO-1",
      grossOrderSubtotal: new Prisma.Decimal(5000),
      deliveryFee: new Prisma.Decimal(1000),
      platformFee: new Prisma.Decimal(750),
      settlementAmount: new Prisma.Decimal(4250)
    }));
    expect(result.items[0]).not.toHaveProperty("customer");
    expect(result.items[0]).not.toHaveProperty("deliveryOtp");
  });

  it("does not expose another vendor's records when the authenticated vendor is missing", async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);

    await expect(service.list("missing-vendor-user", {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.vendorSettlement.findMany).not.toHaveBeenCalled();
  });
});
