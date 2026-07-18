import { BadRequestException } from "@nestjs/common";
import { AccountStatus, DocumentVerificationStatus, UserRole, VendorActivationInvitationStatus, VendorStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
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
    vendorOnboardingDocument: { deleteMany: jest.fn() },
    product: { findMany: jest.fn(), deleteMany: jest.fn() },
    productOption: { deleteMany: jest.fn() },
    productOptionGroup: { deleteMany: jest.fn() },
    vendorAccountActivation: { updateMany: jest.fn(), create: jest.fn() },
    adminAuditLog: { create: jest.fn() }
  };
  const prisma = {
    vendor: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    order: { count: jest.fn() },
    vendorSettlement: { count: jest.fn() },
    promoCode: { count: jest.fn() },
    vendorPayoutAccount: { count: jest.fn() },
    orderItem: { count: jest.fn() },
    product: { count: jest.fn() },
    vendorOnboardingDocument: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const audit = { record: jest.fn() };
  const applicationNotifications = { vendorApplicationReviewed: jest.fn() };
  const service = new AdminOperationsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService,
    applicationNotifications as unknown as ApplicationNotificationsService
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
    user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null, role: UserRole.VENDOR, fullName: "Vendor Owner", phoneNumber: "+2348012345678", email: "vendor@example.test" },
    onboardingDocuments: []
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
    applicationNotifications.vendorApplicationReviewed.mockResolvedValue(undefined);
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
    expect(tx.vendorOnboardingDocument.deleteMany).toHaveBeenCalledWith({ where: { vendorId: vendor.id } });
    expect(tx.vendor.delete).toHaveBeenCalledWith({ where: { id: vendor.id } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: vendor.userId } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "admin.vendor.permanent_delete" })
    }));
  });

  it("blocks marking a vendor operational until onboarding documents are approved", async () => {
    prisma.vendor.findUnique.mockResolvedValueOnce({
      id: vendor.id,
      businessName: vendor.businessName,
      status: VendorStatus.PENDING_APPROVAL,
      deletedAt: null,
      onboardingDocuments: [{ id: "doc-1", verificationStatus: DocumentVerificationStatus.PENDING }]
    });

    await expect(service.updateVendorStatus("admin-1", vendor.id, VendorStatus.ACTIVE)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vendor.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: VendorStatus.ACTIVE } }));
  });

  it("reviews vendor onboarding documents and records admin audit", async () => {
    prisma.vendor.findUnique.mockResolvedValueOnce({ id: vendor.id, deletedAt: null });
    prisma.vendorOnboardingDocument.findFirst.mockResolvedValue({ id: "doc-1", vendorId: vendor.id });
    prisma.vendorOnboardingDocument.update.mockResolvedValue({ id: "doc-1", verificationStatus: DocumentVerificationStatus.APPROVED });

    await expect(service.reviewVendorOnboardingDocument("admin-1", vendor.id, "doc-1", DocumentVerificationStatus.APPROVED, "Looks good")).resolves.toMatchObject({
      id: "doc-1",
      verificationStatus: DocumentVerificationStatus.APPROVED
    });
    expect(prisma.vendorOnboardingDocument.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        verificationStatus: DocumentVerificationStatus.APPROVED,
        reviewedByAdminId: "admin-1"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-1", "admin.vendor_onboarding_document.reviewed", "VendorOnboardingDocument", "doc-1", expect.objectContaining({
      vendorId: vendor.id,
      status: DocumentVerificationStatus.APPROVED
    }));
  });

  it("creates a vendor activation invitation without returning the plaintext URL", async () => {
    prisma.vendor.findUnique.mockResolvedValueOnce({
      id: vendor.id,
      userId: vendor.userId,
      businessName: vendor.businessName,
      deletedAt: null,
      user: { role: UserRole.VENDOR, fullName: "Vendor Owner", phoneNumber: "+2348012345678", email: "vendor@example.test" }
    });

    const result = await service.createVendorActivationLink("admin-1", vendor.id);

    expect(tx.vendorAccountActivation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { vendorId: vendor.id, status: VendorActivationInvitationStatus.PENDING }
    }));
    expect(tx.vendorAccountActivation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: vendor.id,
        userId: vendor.userId,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        createdByAdminId: "admin-1"
      })
    }));
    expect(applicationNotifications.vendorApplicationReviewed).toHaveBeenCalledWith(expect.objectContaining({
      reference: expect.stringMatching(/^VENDOR-/),
      activationUrl: expect.stringContaining("/activate?token="),
      activationExpiresAt: expect.any(String)
    }));
    expect(result).toEqual(expect.objectContaining({
      vendorId: vendor.id,
      tokenVisibleOnce: false,
      notificationQueued: true
    }));
    expect(result).not.toHaveProperty("activationUrl");
  });
});
