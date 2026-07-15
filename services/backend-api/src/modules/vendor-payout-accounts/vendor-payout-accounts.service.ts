import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, PayoutAccountStatus, Prisma } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ListVendorPayoutAccountsQueryDto } from "./dto/list-vendor-payout-accounts-query.dto";
import { ReviewVendorPayoutAccountDto } from "./dto/review-vendor-payout-account.dto";
import { UpsertVendorPayoutAccountDto } from "./dto/upsert-vendor-payout-account.dto";

const VENDOR_ACCOUNT_SELECT = {
  id: true,
  accountName: true,
  bankName: true,
  bankCode: true,
  maskedAccountNumber: true,
  status: true,
  submittedAt: true,
  verifiedAt: true,
  vendorVisibleNote: true,
  lastUpdatedAt: true,
  createdAt: true
} satisfies Prisma.VendorPayoutAccountSelect;

const ADMIN_LIST_SELECT = {
  id: true,
  vendorId: true,
  accountName: true,
  bankName: true,
  bankCode: true,
  maskedAccountNumber: true,
  status: true,
  submittedAt: true,
  verifiedAt: true,
  vendorVisibleNote: true,
  lastUpdatedAt: true,
  createdAt: true,
  vendor: { select: { id: true, businessName: true, phoneNumber: true, email: true, user: { select: { fullName: true, phoneNumber: true, email: true } } } }
} satisfies Prisma.VendorPayoutAccountSelect;

const REVIEW_STATUSES = [PayoutAccountStatus.VERIFIED, PayoutAccountStatus.REJECTED, PayoutAccountStatus.NEEDS_UPDATE] as PayoutAccountStatus[];

@Injectable()
export class VendorPayoutAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService
  ) {}

  async getVendorAccount(userId: string) {
    const vendor = await this.requireVendor(userId);
    const account = await this.prisma.vendorPayoutAccount.findUnique({
      where: { vendorId: vendor.id },
      select: VENDOR_ACCOUNT_SELECT
    });
    return account ? this.toVendorSummary(account) : null;
  }

  async createVendorAccount(userId: string, dto: UpsertVendorPayoutAccountDto) {
    const vendor = await this.requireVendor(userId);
    this.assertMatchingAccountNumbers(dto);
    const existing = await this.prisma.vendorPayoutAccount.findUnique({ where: { vendorId: vendor.id }, select: { id: true } });
    if (existing) throw new BadRequestException("Payout account already exists. Update the existing payout account instead.");

    const account = await this.prisma.vendorPayoutAccount.create({
      data: {
        vendorId: vendor.id,
        accountName: dto.accountName,
        bankName: dto.bankName,
        bankCode: dto.bankCode || null,
        accountNumber: dto.accountNumber,
        maskedAccountNumber: this.maskAccountNumber(dto.accountNumber),
        status: PayoutAccountStatus.PENDING_VERIFICATION,
        vendorVisibleNote: "Your payout account has been submitted for verification."
      },
      select: VENDOR_ACCOUNT_SELECT
    });

    await this.notifyVendor(vendor.userId, NotificationType.PAYOUT_ACCOUNT_SUBMITTED, account.id, "Payout account submitted", "Your payout account has been submitted for verification.");
    return this.toVendorSummary(account);
  }

  async updateVendorAccount(userId: string, dto: UpsertVendorPayoutAccountDto) {
    const vendor = await this.requireVendor(userId);
    this.assertMatchingAccountNumbers(dto);
    const existing = await this.prisma.vendorPayoutAccount.findUnique({ where: { vendorId: vendor.id }, select: { id: true } });
    if (!existing) throw new NotFoundException("Payout account not found");

    const account = await this.prisma.vendorPayoutAccount.update({
      where: { id: existing.id },
      data: {
        accountName: dto.accountName,
        bankName: dto.bankName,
        bankCode: dto.bankCode || null,
        accountNumber: dto.accountNumber,
        maskedAccountNumber: this.maskAccountNumber(dto.accountNumber),
        status: PayoutAccountStatus.PENDING_VERIFICATION,
        submittedAt: new Date(),
        verifiedAt: null,
        verifiedByAdminId: null,
        rejectionReason: null,
        vendorVisibleNote: "Your updated payout account is awaiting verification.",
        internalNote: null
      },
      select: VENDOR_ACCOUNT_SELECT
    });

    await this.notifyVendor(vendor.userId, NotificationType.PAYOUT_ACCOUNT_UPDATED, account.id, "Payout account updated", "Your payout account has been updated and is awaiting verification.");
    return this.toVendorSummary(account);
  }

  async adminList(query: ListVendorPayoutAccountsQueryDto) {
    const where: Prisma.VendorPayoutAccountWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      ...(query.search ? {
        OR: [
          { accountName: { contains: query.search, mode: "insensitive" } },
          { bankName: { contains: query.search, mode: "insensitive" } },
          { maskedAccountNumber: { contains: query.search } },
          { vendor: { businessName: { contains: query.search, mode: "insensitive" } } },
          { vendor: { phoneNumber: { contains: query.search } } },
          { vendor: { email: { contains: query.search, mode: "insensitive" } } }
        ]
      } : {})
    };

    const [items, pendingReview, verifiedAccounts, needsUpdate, rejectedAccounts] = await Promise.all([
      this.prisma.vendorPayoutAccount.findMany({
        where,
        select: ADMIN_LIST_SELECT,
        orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
        take: 100
      }),
      this.prisma.vendorPayoutAccount.count({ where: { status: PayoutAccountStatus.PENDING_VERIFICATION } }),
      this.prisma.vendorPayoutAccount.count({ where: { status: PayoutAccountStatus.VERIFIED } }),
      this.prisma.vendorPayoutAccount.count({ where: { status: PayoutAccountStatus.NEEDS_UPDATE } }),
      this.prisma.vendorPayoutAccount.count({ where: { status: PayoutAccountStatus.REJECTED } })
    ]);

    return {
      summary: { pendingReview, verifiedAccounts, needsUpdate, rejectedAccounts },
      items: items.map((item) => this.toAdminListItem(item))
    };
  }

  async adminDetail(payoutAccountId: string) {
    const account = await this.prisma.vendorPayoutAccount.findUnique({
      where: { id: payoutAccountId },
      include: {
        vendor: { select: { id: true, businessName: true, phoneNumber: true, email: true, address: true, city: true, state: true, user: { select: { id: true, fullName: true, phoneNumber: true, email: true } } } },
        verifiedByAdmin: { select: { id: true, fullName: true, email: true } }
      }
    });
    if (!account) throw new NotFoundException("Vendor payout account not found");

    const reviewHistory = await this.prisma.adminAuditLog.findMany({
      where: { entityType: "VendorPayoutAccount", entityId: payoutAccountId },
      select: { id: true, action: true, newValue: true, createdAt: true, adminUser: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return {
      ...this.toAdminListItem(account),
      accountNumber: account.accountNumber,
      rejectionReason: account.rejectionReason,
      internalNote: account.internalNote,
      verifiedByAdmin: account.verifiedByAdmin,
      reviewHistory: reviewHistory.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))
    };
  }

  async adminReview(adminUserId: string, payoutAccountId: string, dto: ReviewVendorPayoutAccountDto) {
    if (!REVIEW_STATUSES.includes(dto.status)) {
      throw new BadRequestException("Admin review status must be VERIFIED, REJECTED or NEEDS_UPDATE");
    }
    const noteRequired = dto.status === PayoutAccountStatus.REJECTED || dto.status === PayoutAccountStatus.NEEDS_UPDATE;
    if (noteRequired && !dto.vendorVisibleNote) {
      throw new BadRequestException("A vendor-visible note is required for rejected accounts or accounts needing an update");
    }

    const current = await this.prisma.vendorPayoutAccount.findUnique({
      where: { id: payoutAccountId },
      include: { vendor: { select: { id: true, userId: true } } }
    });
    if (!current) throw new NotFoundException("Vendor payout account not found");

    const vendorMessage = this.reviewVendorMessage(dto.status, dto.vendorVisibleNote);
    const updated = await this.prisma.vendorPayoutAccount.update({
      where: { id: payoutAccountId },
      data: {
        status: dto.status,
        verifiedAt: dto.status === PayoutAccountStatus.VERIFIED ? new Date() : null,
        verifiedByAdminId: dto.status === PayoutAccountStatus.VERIFIED ? adminUserId : null,
        rejectionReason: dto.status === PayoutAccountStatus.REJECTED ? dto.vendorVisibleNote : null,
        vendorVisibleNote: vendorMessage,
        internalNote: dto.internalNote ?? null
      },
      select: ADMIN_LIST_SELECT
    });

    await this.audit.record(adminUserId, "vendor_payout_account.reviewed", "VendorPayoutAccount", payoutAccountId, {
      vendorId: current.vendorId,
      previousStatus: current.status,
      status: dto.status
    });
    await this.notifyVendor(current.vendor.userId, this.notificationType(dto.status), payoutAccountId, this.notificationTitle(dto.status), vendorMessage);

    return this.adminDetail(updated.id);
  }

  private async requireVendor(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { userId, deletedAt: null }, select: { id: true, userId: true, businessName: true } });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return vendor;
  }

  private assertMatchingAccountNumbers(dto: UpsertVendorPayoutAccountDto) {
    if (dto.accountNumber !== dto.confirmAccountNumber) {
      throw new BadRequestException("Account number and confirmation account number do not match");
    }
  }

  private maskAccountNumber(accountNumber: string) {
    return `**** **** ${accountNumber.slice(-4)}`;
  }

  private notifyVendor(userId: string, type: NotificationType, entityId: string, title: string, message: string) {
    return this.notifications.createNotification({
      userId,
      title,
      message,
      type,
      entityType: "VendorPayoutAccount",
      entityId
    });
  }

  private reviewVendorMessage(status: PayoutAccountStatus, note?: string) {
    if (status === PayoutAccountStatus.VERIFIED) return note || "Your payout account has been verified and is ready for future settlements.";
    if (status === PayoutAccountStatus.NEEDS_UPDATE) return `Your payout account needs an update: ${note}`;
    return `Your payout account was rejected: ${note}`;
  }

  private notificationType(status: PayoutAccountStatus) {
    const types: Record<PayoutAccountStatus, NotificationType> = {
      PENDING_VERIFICATION: NotificationType.PAYOUT_ACCOUNT_UPDATED,
      VERIFIED: NotificationType.PAYOUT_ACCOUNT_VERIFIED,
      NEEDS_UPDATE: NotificationType.PAYOUT_ACCOUNT_NEEDS_UPDATE,
      REJECTED: NotificationType.PAYOUT_ACCOUNT_REJECTED
    };
    return types[status];
  }

  private notificationTitle(status: PayoutAccountStatus) {
    const titles: Record<PayoutAccountStatus, string> = {
      PENDING_VERIFICATION: "Payout account updated",
      VERIFIED: "Payout account verified",
      NEEDS_UPDATE: "Payout account needs update",
      REJECTED: "Payout account rejected"
    };
    return titles[status];
  }

  private toVendorSummary(account: Prisma.VendorPayoutAccountGetPayload<{ select: typeof VENDOR_ACCOUNT_SELECT }>) {
    return {
      ...account,
      submittedAt: account.submittedAt.toISOString(),
      verifiedAt: account.verifiedAt?.toISOString() ?? null,
      lastUpdatedAt: account.lastUpdatedAt.toISOString(),
      createdAt: account.createdAt.toISOString()
    };
  }

  private toAdminListItem(account: Prisma.VendorPayoutAccountGetPayload<{ select: typeof ADMIN_LIST_SELECT }> | Awaited<ReturnType<PrismaService["vendorPayoutAccount"]["findUnique"]>>) {
    const item = account as Prisma.VendorPayoutAccountGetPayload<{ select: typeof ADMIN_LIST_SELECT }> & { accountNumber?: string | null; rejectionReason?: string | null; internalNote?: string | null };
    return {
      id: item.id,
      vendorId: item.vendorId,
      vendor: item.vendor,
      accountName: item.accountName,
      bankName: item.bankName,
      bankCode: item.bankCode,
      maskedAccountNumber: item.maskedAccountNumber,
      status: item.status,
      submittedAt: item.submittedAt.toISOString(),
      verifiedAt: item.verifiedAt?.toISOString() ?? null,
      vendorVisibleNote: item.vendorVisibleNote,
      lastUpdatedAt: item.lastUpdatedAt.toISOString(),
      createdAt: item.createdAt.toISOString()
    };
  }
}
