import { BadRequestException } from "@nestjs/common";
import { AccountStatus, VendorStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminOperationsService } from "./admin-operations.service";

describe("AdminOperationsService vendor cleanup", () => {
  const tx = {
    vendor: { update: jest.fn(), delete: jest.fn() },
    user: { update: jest.fn(), delete: jest.fn() },
    refreshToken: { updateMany: jest.fn(), deleteMany: jest.fn() },
    deviceToken: { updateMany: jest.fn(), deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    otpVerification: { deleteMany: jest.fn() },
    product: { findMany: jest.fn(), deleteMany: jest.fn() },
    productOption: { deleteMany: jest.fn() },
    productOptionGroup: { deleteMany: jest.fn() },
    adminAuditLog: { create: jest.fn() }
  };
  const prisma = {
    vendor: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    order: { count: jest.fn() },
    vendorSettlement: { count: jest.fn() },
    promoCode: { count: jest.fn() },
    vendorPayoutAccount: { count: jest.fn() },
    orderItem: { count: jest.fn() },
    product: { count: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const audit = { record: jest.fn() };
  const service = new AdminOperationsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  const vendor = {
    id: "00000000-0000-0000-0000-00000000v001",
    userId: "00000000-0000-0000-0000-00000000u001",
    businessName: "Test Vendor",
    businessCategory: "FOOD",
    city: "Kano",
    state: "Kano",
    status: VendorStatus.ACTIVE,
    isOpen: true,
    totalOrders: 0,
    deletedAt: null,
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendor.findUnique.mockResolvedValue(vendor);
    prisma.order.count.mockResolvedValue(0);
    prisma.vendorSettlement.count.mockResolvedValue(0);
    prisma.promoCode.count.mockResolvedValue(0);
    prisma.vendorPayoutAccount.count.mockResolvedValue(0);
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.product.count.mockResolvedValue(1);
    tx.vendor.update.mockResolvedValue({ ...vendor, deletedAt: new Date("2026-07-15T01:00:00.000Z") });
    tx.product.findMany.mockResolvedValue([{ id: "product-1" }]);
  });

  it("moves a vendor to Trash and disables active auth artifacts", async () => {
    await service.trashVendor("admin-1", vendor.id, "staging cleanup");

    expect(tx.vendor.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: vendor.id },
      data: expect.objectContaining({ deletedAt: expect.any(Date), isOpen: false })
    }));
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: vendor.userId },
      data: { deletedAt: expect.any(Date) }
    });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: vendor.userId, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(tx.deviceToken.updateMany).toHaveBeenCalledWith({
      where: { userId: vendor.userId, isActive: true },
      data: { isActive: false }
    });
    expect(audit.record).toHaveBeenCalledWith("admin-1", "admin.vendor.trash", "Vendor", vendor.id, expect.objectContaining({
      reason: "staging cleanup"
    }));
  });

  it("blocks permanent deletion when protected operational records exist", async () => {
    prisma.vendor.findUnique.mockResolvedValue({ ...vendor, deletedAt: new Date("2026-07-15T01:00:00.000Z") });
    prisma.order.count.mockResolvedValue(1);

    await expect(service.permanentlyDeleteVendor("admin-1", vendor.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.vendor.delete).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("permanently deletes only a trashed vendor with no protected records", async () => {
    prisma.vendor.findUnique.mockResolvedValue({ ...vendor, deletedAt: new Date("2026-07-15T01:00:00.000Z") });

    await service.permanentlyDeleteVendor("admin-1", vendor.id);

    expect(tx.productOption.deleteMany).toHaveBeenCalled();
    expect(tx.productOptionGroup.deleteMany).toHaveBeenCalled();
    expect(tx.product.deleteMany).toHaveBeenCalledWith({ where: { vendorId: vendor.id } });
    expect(tx.vendor.delete).toHaveBeenCalledWith({ where: { id: vendor.id } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: vendor.userId } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "admin.vendor.permanent_delete" })
    }));
  });
});
