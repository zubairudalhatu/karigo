import { BadRequestException } from "@nestjs/common";
import { SettlementStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SettlementsService } from "./settlements.service";

describe("SettlementsService", () => {
  const prisma = {
    vendorSettlement: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    riderEarning: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    vendor: { findUnique: jest.fn() },
    rider: { findUnique: jest.fn() }
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new SettlementsService(prisma as unknown as PrismaService, audit as never, notifications as never);

  beforeEach(() => jest.clearAllMocks());

  it("marks a pending vendor settlement paid and audits it", async () => {
    prisma.vendorSettlement.findUnique.mockResolvedValue({
      id: "settlement-1", vendorId: "vendor-1", orderId: "order-1", settlementStatus: SettlementStatus.PENDING
    });
    prisma.vendorSettlement.update.mockResolvedValue({ id: "settlement-1", settlementStatus: SettlementStatus.PAID });
    await service.markVendorPaid("admin-1", "settlement-1");
    expect(prisma.vendorSettlement.update).toHaveBeenCalledWith({
      where: { id: "settlement-1" },
      data: { settlementStatus: SettlementStatus.PAID, paidAt: expect.any(Date) }
    });
    expect(audit.record).toHaveBeenCalledWith("admin-1", "settlement.vendor.marked_paid", "VendorSettlement", "settlement-1", expect.any(Object));
  });

  it("returns an already paid rider earning without paying twice", async () => {
    const paid = { id: "earning-1", payoutStatus: SettlementStatus.PAID };
    prisma.riderEarning.findUnique.mockResolvedValue(paid);
    await expect(service.markRiderPaid("admin-1", "earning-1")).resolves.toBe(paid);
    expect(prisma.riderEarning.update).not.toHaveBeenCalled();
  });

  it("rejects failed settlements from being marked paid", async () => {
    prisma.vendorSettlement.findUnique.mockResolvedValue({ id: "settlement-1", settlementStatus: SettlementStatus.FAILED });
    await expect(service.markVendorPaid("admin-1", "settlement-1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
