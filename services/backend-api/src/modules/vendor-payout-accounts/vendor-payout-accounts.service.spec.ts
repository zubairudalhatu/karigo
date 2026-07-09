import { BadRequestException, NotFoundException } from "@nestjs/common";
import { NotificationType, PayoutAccountStatus } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { VendorPayoutAccountsService } from "./vendor-payout-accounts.service";

const now = new Date("2026-07-09T09:00:00.000Z");
const baseAccount = {
  id: "00000000-0000-0000-0000-000000000201",
  vendorId: "vendor-a",
  accountName: "Kano Kitchen Vendor",
  bankName: "KariGO Demo Bank",
  bankCode: "KGO",
  accountNumber: "0000000201",
  maskedAccountNumber: "**** **** 0201",
  status: PayoutAccountStatus.PENDING_VERIFICATION,
  submittedAt: now,
  verifiedAt: null,
  verifiedByAdminId: null,
  rejectionReason: null,
  vendorVisibleNote: "Pending review",
  internalNote: null,
  lastUpdatedAt: now,
  createdAt: now,
  vendor: {
    id: "vendor-a",
    userId: "vendor-user-a",
    businessName: "Kano Kitchen",
    phoneNumber: "08000000000",
    email: "vendor@karigo.local",
    user: { fullName: "Kano Kitchen Vendor", phoneNumber: "08000000000", email: "vendor@karigo.local" }
  }
};
const { accountNumber: _accountNumber, verifiedByAdminId: _verifiedByAdminId, rejectionReason: _rejectionReason, internalNote: _internalNote, vendor: _vendor, ...vendorSummaryAccount } = baseAccount;

describe("VendorPayoutAccountsService", () => {
  const prisma = {
    vendor: { findUnique: jest.fn() },
    vendorPayoutAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    adminAuditLog: { findMany: jest.fn() }
  };
  const audit = { record: jest.fn() };
  const notifications = { createNotification: jest.fn() };
  const service = new VendorPayoutAccountsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService,
    notifications as unknown as NotificationsService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendor.findUnique.mockResolvedValue({ id: "vendor-a", userId: "vendor-user-a", businessName: "Kano Kitchen" });
    notifications.createNotification.mockResolvedValue({});
    audit.record.mockResolvedValue({});
  });

  it("lets a vendor create one masked payout account in pending verification state", async () => {
    prisma.vendorPayoutAccount.findUnique.mockResolvedValue(null);
    prisma.vendorPayoutAccount.create.mockResolvedValue(vendorSummaryAccount);

    const result = await service.createVendorAccount("vendor-user-a", {
      accountName: "Kano Kitchen Vendor",
      bankName: "KariGO Demo Bank",
      bankCode: "KGO",
      accountNumber: "0000000201",
      confirmAccountNumber: "0000000201"
    });

    expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
      where: { userId: "vendor-user-a" },
      select: { id: true, userId: true, businessName: true }
    });
    expect(prisma.vendorPayoutAccount.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "vendor-a",
        accountNumber: "0000000201",
        maskedAccountNumber: "**** **** 0201",
        status: PayoutAccountStatus.PENDING_VERIFICATION
      })
    }));
    expect(result).not.toHaveProperty("accountNumber");
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "vendor-user-a",
      type: NotificationType.PAYOUT_ACCOUNT_SUBMITTED,
      message: "Your payout account has been submitted for verification."
    }));
  });

  it("blocks mismatched account confirmation", async () => {
    await expect(service.createVendorAccount("vendor-user-a", {
      accountName: "Kano Kitchen Vendor",
      bankName: "KariGO Demo Bank",
      accountNumber: "0000000201",
      confirmAccountNumber: "0000000202"
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vendorPayoutAccount.create).not.toHaveBeenCalled();
  });

  it("updates only the authenticated vendor account and resets verification to pending", async () => {
    prisma.vendorPayoutAccount.findUnique.mockResolvedValue({ id: baseAccount.id });
    prisma.vendorPayoutAccount.update.mockResolvedValue({ ...vendorSummaryAccount, vendorVisibleNote: "Your updated payout account is awaiting verification." });

    await service.updateVendorAccount("vendor-user-a", {
      accountName: "Kano Kitchen Vendor",
      bankName: "KariGO Demo Bank",
      accountNumber: "0000000201",
      confirmAccountNumber: "0000000201"
    });

    expect(prisma.vendorPayoutAccount.findUnique).toHaveBeenCalledWith({ where: { vendorId: "vendor-a" }, select: { id: true } });
    expect(prisma.vendorPayoutAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: baseAccount.id },
      data: expect.objectContaining({
        status: PayoutAccountStatus.PENDING_VERIFICATION,
        verifiedAt: null,
        verifiedByAdminId: null,
        rejectionReason: null,
        internalNote: null
      })
    }));
  });

  it("does not expose full account numbers in admin list responses", async () => {
    prisma.vendorPayoutAccount.findMany.mockResolvedValue([baseAccount]);
    prisma.vendorPayoutAccount.count.mockResolvedValue(1);

    const result = await service.adminList({});

    expect(result.items[0]).toMatchObject({
      id: baseAccount.id,
      maskedAccountNumber: "**** **** 0201"
    });
    expect(result.items[0]).not.toHaveProperty("accountNumber");
  });

  it("lets admins verify accounts with audit and safe vendor notification", async () => {
    prisma.vendorPayoutAccount.findUnique.mockResolvedValueOnce(baseAccount);
    prisma.vendorPayoutAccount.update.mockResolvedValue({ ...baseAccount, status: PayoutAccountStatus.VERIFIED, verifiedAt: now });
    jest.spyOn(service, "adminDetail").mockResolvedValueOnce({ id: baseAccount.id, status: PayoutAccountStatus.VERIFIED } as never);

    await service.adminReview("admin-user", baseAccount.id, {
      status: PayoutAccountStatus.VERIFIED,
      vendorVisibleNote: "Your payout account has been verified."
    });

    expect(prisma.vendorPayoutAccount.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: PayoutAccountStatus.VERIFIED,
        verifiedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "vendor_payout_account.reviewed", "VendorPayoutAccount", baseAccount.id, {
      vendorId: "vendor-a",
      previousStatus: PayoutAccountStatus.PENDING_VERIFICATION,
      status: PayoutAccountStatus.VERIFIED
    });
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "vendor-user-a",
      type: NotificationType.PAYOUT_ACCOUNT_VERIFIED
    }));
    expect(audit.record.mock.calls[0][4]).not.toHaveProperty("accountNumber");
    expect(audit.record.mock.calls[0][4]).not.toHaveProperty("maskedAccountNumber");
  });

  it("requires a vendor-visible note before rejecting or requesting updates", async () => {
    await expect(service.adminReview("admin-user", baseAccount.id, {
      status: PayoutAccountStatus.REJECTED
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.adminReview("admin-user", baseAccount.id, {
      status: PayoutAccountStatus.NEEDS_UPDATE
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not expose another vendor's account when the authenticated vendor profile is missing", async () => {
    prisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.getVendorAccount("not-a-vendor")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.vendorPayoutAccount.findUnique).not.toHaveBeenCalled();
  });
});
