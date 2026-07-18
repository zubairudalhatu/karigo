import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  CashCollectionStatus,
  DocumentVerificationStatus,
  OrderPaymentMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  SupportTicketStatus,
  UserRole,
  VendorActivationInvitationStatus,
  VendorStatus
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { ReportDateRangeDto } from "./dto/report-date-range.dto";

const CLOSED_ORDERS = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED, OrderStatus.REFUNDED];
const VENDOR_CLEANUP_SELECT = {
  id: true,
  userId: true,
  businessName: true,
  businessCategory: true,
  city: true,
  state: true,
  status: true,
  isOpen: true,
  totalOrders: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { accountStatus: true, deletedAt: true } },
  onboardingDocuments: {
    orderBy: { uploadedAt: "desc" },
    take: 20,
    select: {
      id: true,
      documentType: true,
      documentName: true,
      documentUrl: true,
      verificationStatus: true,
      adminNote: true,
      uploadedAt: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true
    }
  }
} satisfies Prisma.VendorSelect;

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly config?: ConfigService
  ) {}

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      totalUsers, totalCustomers, totalVendors, activeVendors, totalRiders, onlineRiders,
      totalOrders, ordersToday, activeOrders, completedOrders, cancelledOrders, failedOrders,
      pendingSupportTickets, openRefundRequests, orderTotals, settlementTotals, earningTotals
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, deletedAt: null } }),
      this.prisma.vendor.count({ where: { deletedAt: null } }),
      this.prisma.vendor.count({ where: { status: VendorStatus.ACTIVE, deletedAt: null } }),
      this.prisma.rider.count({ where: { deletedAt: null } }),
      this.prisma.rider.count({ where: { availabilityStatus: RiderStatus.ONLINE, deletedAt: null } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { orderStatus: { notIn: CLOSED_ORDERS } } }),
      this.prisma.order.count({ where: { orderStatus: OrderStatus.COMPLETED } }),
      this.prisma.order.count({ where: { orderStatus: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { orderStatus: OrderStatus.FAILED } }),
      this.prisma.supportTicket.count({ where: { status: { notIn: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] } } }),
      this.prisma.payment.count({ where: { paymentStatus: PaymentStatus.REFUND_PENDING } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.SUCCESSFUL },
        _sum: { totalAmount: true, deliveryFee: true }
      }),
      this.prisma.vendorSettlement.aggregate({
        where: { settlementStatus: SettlementStatus.PENDING },
        _sum: { netAmount: true, commissionAmount: true }
      }),
      this.prisma.riderEarning.aggregate({
        where: { payoutStatus: SettlementStatus.PENDING },
        _sum: { riderPayout: true }
      })
    ]);
    return {
      totalUsers, totalCustomers, totalVendors, activeVendors, totalRiders, onlineRiders,
      totalOrders, ordersToday, activeOrders, completedOrders, cancelledOrders, failedOrders,
      pendingSupportTickets, openRefundRequests,
      grossMerchandiseValue: orderTotals._sum.totalAmount ?? new Prisma.Decimal(0),
      deliveryFeeTotal: orderTotals._sum.deliveryFee ?? new Prisma.Decimal(0),
      commissionRevenue: settlementTotals._sum.commissionAmount ?? new Prisma.Decimal(0),
      pendingVendorSettlements: settlementTotals._sum.netAmount ?? new Prisma.Decimal(0),
      pendingRiderEarnings: earningTotals._sum.riderPayout ?? new Prisma.Decimal(0)
    };
  }

  orders(query: ListAdminOrdersQueryDto) {
    return this.prisma.order.findMany({
      where: {
        ...(query.status ? { orderStatus: query.status } : {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
        ...(query.riderId ? { riderId: query.riderId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.serviceCategory ? { serviceCategory: query.serviceCategory } : {}),
        ...(query.search ? { orderNumber: { contains: query.search, mode: "insensitive" as const } } : {}),
        ...this.dateWhere(query)
      },
      select: {
        id: true, orderNumber: true, serviceCategory: true, orderStatus: true, paymentStatus: true,
        paymentMethod: true, cashCollectionStatus: true, cashCollectedAmount: true, cashCollectedAt: true,
        cashReconciledAt: true, totalAmount: true, createdAt: true, updatedAt: true,
        vendor: { select: { id: true, businessName: true } },
        rider: { select: { id: true, riderCode: true } },
        customer: { select: { id: true, user: { select: { fullName: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async order(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, serviceCategory: true, orderStatus: true, paymentStatus: true,
        paymentMethod: true, cashCollectionStatus: true, cashCollectedAmount: true, cashCollectedAt: true,
        cashCollectedByRiderId: true, cashReconciledAt: true, cashReconciledByAdminId: true,
        cashReconciliationNote: true,
        subtotal: true, deliveryFee: true, serviceFee: true, discountAmount: true, totalAmount: true,
        customerNote: true, createdAt: true, updatedAt: true, completedAt: true,
        customer: { select: { id: true, user: { select: { fullName: true, phoneNumber: true, email: true } } } },
        vendor: { select: { id: true, businessName: true, status: true, phoneNumber: true } },
        rider: { select: { id: true, riderCode: true, phoneNumber: true, availabilityStatus: true } },
        deliveryAddress: true, items: true,
        payments: { select: { id: true, gateway: true, amount: true, paymentStatus: true, paidAt: true, createdAt: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        supportTickets: { select: { id: true, ticketNumber: true, category: true, priority: true, status: true } },
        settlements: true, riderEarnings: true
      }
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async operationsReport(range: ReportDateRangeDto) {
    const orders = await this.prisma.order.findMany({
      where: this.dateWhere(range),
      select: { orderStatus: true, serviceCategory: true, totalAmount: true, vendorId: true, riderId: true, vendor: { select: { businessName: true } }, rider: { select: { riderCode: true, user: { select: { fullName: true } } } } }
    });
    const rejectionHistory = await this.prisma.orderStatusHistory.groupBy({
      by: ["newStatus"],
      where: { newStatus: { in: [OrderStatus.VENDOR_REJECTED, OrderStatus.READY_FOR_PICKUP] }, ...this.dateWhere(range) },
      _count: true
    });
    const completed = orders.filter((o) => o.orderStatus === OrderStatus.COMPLETED);
    return {
      totalOrders: orders.length,
      completedOrders: completed.length,
      cancelledOrders: orders.filter((o) => o.orderStatus === OrderStatus.CANCELLED).length,
      failedOrders: orders.filter((o) => o.orderStatus === OrderStatus.FAILED).length,
      averageOrderValue: this.average(orders.map((o) => o.totalAmount)),
      averagePreparationTimeMinutes: 0, // TODO: persist preparation timestamps for accurate duration reporting.
      averageDeliveryTimeMinutes: 0, // TODO: persist delivery-stage timestamps for accurate duration reporting.
      ordersByStatus: this.countBy(orders, "orderStatus"),
      ordersByServiceCategory: this.countBy(orders, "serviceCategory"),
      topVendors: this.topBy(completed.filter((o) => o.vendorId), "vendorId", (o) => o.vendor?.businessName ?? "Unknown"),
      topRiders: this.topBy(completed.filter((o) => o.riderId), "riderId", (o) => o.rider?.user.fullName ?? o.rider?.riderCode ?? "Unknown"),
      vendorRejectionCount: rejectionHistory.find((r) => r.newStatus === OrderStatus.VENDOR_REJECTED)?._count ?? 0,
      riderRejectionCount: rejectionHistory.find((r) => r.newStatus === OrderStatus.READY_FOR_PICKUP)?._count ?? 0
    };
  }

  async financeReport(range: ReportDateRangeDto) {
    const date = this.dateWhere(range);
    const [orders, payments, settlements, earnings] = await Promise.all([
      this.prisma.order.findMany({ where: date, select: { paymentStatus: true, totalAmount: true, deliveryFee: true } }),
      this.prisma.payment.findMany({ where: date, select: { paymentStatus: true, amount: true } }),
      this.prisma.vendorSettlement.findMany({ where: date, select: { settlementStatus: true, netAmount: true, commissionAmount: true } }),
      this.prisma.riderEarning.findMany({ where: date, select: { payoutStatus: true, riderPayout: true } })
    ]);
    const successfulOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.SUCCESSFUL);
    const commissionRevenue = this.sum(settlements.map((s) => s.commissionAmount));
    return {
      grossMerchandiseValue: this.sum(successfulOrders.map((o) => o.totalAmount)),
      totalSuccessfulPayments: this.sum(payments.filter((p) => p.paymentStatus === PaymentStatus.SUCCESSFUL).map((p) => p.amount)),
      totalFailedPayments: this.sum(payments.filter((p) => p.paymentStatus === PaymentStatus.FAILED).map((p) => p.amount)),
      totalRefundedPayments: this.sum(payments.filter((p) => p.paymentStatus === PaymentStatus.REFUNDED).map((p) => p.amount)),
      totalRefundPending: this.sum(payments.filter((p) => p.paymentStatus === PaymentStatus.REFUND_PENDING).map((p) => p.amount)),
      deliveryFeesCollected: this.sum(successfulOrders.map((o) => o.deliveryFee)),
      commissionRevenue,
      vendorSettlementsPending: this.sum(settlements.filter((s) => s.settlementStatus === SettlementStatus.PENDING).map((s) => s.netAmount)),
      vendorSettlementsPaid: this.sum(settlements.filter((s) => s.settlementStatus === SettlementStatus.PAID).map((s) => s.netAmount)),
      riderEarningsPending: this.sum(earnings.filter((e) => e.payoutStatus === SettlementStatus.PENDING).map((e) => e.riderPayout)),
      riderEarningsPaid: this.sum(earnings.filter((e) => e.payoutStatus === SettlementStatus.PAID).map((e) => e.riderPayout)),
      netRevenue: commissionRevenue
    };
  }

  vendorReport() {
    return this.prisma.vendor.findMany({
      where: { deletedAt: null },
      select: {
        id: true, businessName: true, status: true,
        orders: { select: { orderStatus: true, totalAmount: true } },
        settlements: { select: { settlementStatus: true, netAmount: true } }
      }
    }).then((vendors) => vendors.map((v) => ({
      id: v.id, businessName: v.businessName, status: v.status, totalOrders: v.orders.length,
      completedOrders: v.orders.filter((o) => o.orderStatus === OrderStatus.COMPLETED).length,
      rejectedOrders: v.orders.filter((o) => o.orderStatus === OrderStatus.VENDOR_REJECTED).length,
      cancelledOrders: v.orders.filter((o) => o.orderStatus === OrderStatus.CANCELLED).length,
      grossOrderValue: this.sum(v.orders.map((o) => o.totalAmount)),
      pendingSettlementAmount: this.sum(v.settlements.filter((s) => s.settlementStatus === SettlementStatus.PENDING).map((s) => s.netAmount)),
      paidSettlementAmount: this.sum(v.settlements.filter((s) => s.settlementStatus === SettlementStatus.PAID).map((s) => s.netAmount)),
      averagePreparationTimeMinutes: 0 // TODO: calculate after preparation timestamps are persisted.
    })));
  }

  riderReport() {
    return this.prisma.rider.findMany({
      where: { deletedAt: null },
      select: {
        id: true, riderCode: true, verificationStatus: true, availabilityStatus: true,
        user: { select: { fullName: true } },
        orders: { select: { orderStatus: true } },
        earnings: { select: { payoutStatus: true, riderPayout: true } }
      }
    }).then((riders) => riders.map((r) => ({
      id: r.id, name: r.user.fullName, status: r.verificationStatus, availability: r.availabilityStatus,
      totalAssignedJobs: r.orders.length,
      completedJobs: r.orders.filter((o) => o.orderStatus === OrderStatus.COMPLETED).length,
      rejectedJobs: 0, // TODO: persist rider rejection actor relation for per-rider reporting.
      failedDeliveries: r.orders.filter((o) => o.orderStatus === OrderStatus.FAILED).length,
      totalEarnings: this.sum(r.earnings.map((e) => e.riderPayout)),
      pendingEarnings: this.sum(r.earnings.filter((e) => e.payoutStatus === SettlementStatus.PENDING).map((e) => e.riderPayout)),
      paidEarnings: this.sum(r.earnings.filter((e) => e.payoutStatus === SettlementStatus.PAID).map((e) => e.riderPayout))
    })));
  }

  async orderNote(adminUserId: string, orderId: string, note: string) {
    await this.order(orderId);
    await this.audit.record(adminUserId, "admin.order.status_note", "Order", orderId, { note });
    return { orderId, note };
  }

  async reconcileCashOrder(adminUserId: string, orderId: string, note: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentMethod: true,
        paymentStatus: true,
        cashCollectionStatus: true,
        cashCollectedAmount: true,
        totalAmount: true
      }
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentMethod !== OrderPaymentMethod.CASH_ON_DELIVERY || order.paymentStatus !== PaymentStatus.CASH_PENDING) {
      throw new BadRequestException("Only Cash/POD orders can be manually reconciled here.");
    }
    if (order.cashCollectionStatus === CashCollectionStatus.RECONCILED) {
      return this.order(orderId);
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        cashCollectionStatus: CashCollectionStatus.RECONCILED,
        cashCollectedAmount: order.cashCollectedAmount ?? order.totalAmount,
        cashReconciledAt: new Date(),
        cashReconciledByAdminId: adminUserId,
        cashReconciliationNote: note,
        statusHistory: {
          create: {
            previousStatus: order.orderStatus,
            newStatus: order.orderStatus,
            changedByUserId: adminUserId,
            changedByRole: "ADMIN",
            note: `Cash/POD manually reconciled: ${note}`
          }
        }
      },
      select: { id: true }
    });
    await this.audit.record(adminUserId, "order.cash.reconciled", "Order", orderId, {
      orderNumber: order.orderNumber,
      amount: (order.cashCollectedAmount ?? order.totalAmount).toFixed(2),
      note
    });
    return this.order(updated.id);
  }

  users() {
    return this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  }
  vendors() {
    return this.prisma.vendor.findMany({
      where: { deletedAt: null },
      select: VENDOR_CLEANUP_SELECT,
      orderBy: { createdAt: "desc" }
    }).then((vendors) => vendors.map((vendor) => this.vendorCleanupView(vendor)));
  }

  trashedVendors() {
    return this.prisma.vendor.findMany({
      where: { deletedAt: { not: null } },
      select: VENDOR_CLEANUP_SELECT,
      orderBy: { deletedAt: "desc" }
    }).then(async (vendors) => Promise.all(vendors.map(async (vendor) => ({
      ...this.vendorCleanupView(vendor),
      cleanupSafety: await this.vendorCleanupSafety(vendor.id)
    }))));
  }

  async trashVendor(adminUserId: string, vendorId: string, reason?: string) {
    const vendor = await this.findVendorForCleanup(vendorId);
    if (vendor.deletedAt) {
      return { ...this.vendorCleanupView(vendor), cleanupSafety: await this.vendorCleanupSafety(vendor.id) };
    }

    const trashedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: vendor.userId }, data: { deletedAt: trashedAt } });
      const next = await tx.vendor.update({
        where: { id: vendor.id },
        data: { deletedAt: trashedAt, isOpen: false },
        select: VENDOR_CLEANUP_SELECT
      });
      await tx.refreshToken.updateMany({ where: { userId: vendor.userId, revokedAt: null }, data: { revokedAt: trashedAt } });
      await tx.deviceToken.updateMany({ where: { userId: vendor.userId, isActive: true }, data: { isActive: false } });
      return next;
    });

    await this.audit.record(adminUserId, "admin.vendor.trash", "Vendor", vendor.id, {
      reason: reason ?? null,
      businessName: vendor.businessName
    });

    return { ...this.vendorCleanupView(updated), cleanupSafety: await this.vendorCleanupSafety(updated.id) };
  }

  async restoreVendor(adminUserId: string, vendorId: string, reason?: string) {
    const vendor = await this.findVendorForCleanup(vendorId);
    if (!vendor.deletedAt) {
      return this.vendorCleanupView(vendor);
    }

    const restored = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: vendor.userId }, data: { deletedAt: null } });
      return tx.vendor.update({
        where: { id: vendor.id },
        data: { deletedAt: null },
        select: VENDOR_CLEANUP_SELECT
      });
    });

    await this.audit.record(adminUserId, "admin.vendor.restore", "Vendor", vendor.id, {
      reason: reason ?? null,
      businessName: vendor.businessName
    });

    return this.vendorCleanupView(restored);
  }

  async permanentlyDeleteVendor(adminUserId: string, vendorId: string) {
    const vendor = await this.findVendorForCleanup(vendorId);
    const safety = await this.vendorCleanupSafety(vendor.id);

    if (!safety.canPermanentlyDelete) {
      throw new BadRequestException({
        message: "Vendor cannot be permanently deleted. Move it to Trash first and ensure it has no protected operational records.",
        details: safety
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { vendorId: vendor.id }, select: { id: true } });
      const productIds = products.map((product) => product.id);
      if (productIds.length) {
        await tx.productOption.deleteMany({ where: { optionGroup: { productId: { in: productIds } } } });
        await tx.productOptionGroup.deleteMany({ where: { productId: { in: productIds } } });
      }
      await tx.product.deleteMany({ where: { vendorId: vendor.id } });
      await tx.notification.deleteMany({ where: { userId: vendor.userId } });
      await tx.deviceToken.deleteMany({ where: { userId: vendor.userId } });
      await tx.refreshToken.deleteMany({ where: { userId: vendor.userId } });
      await tx.otpVerification.deleteMany({ where: { userId: vendor.userId } });
      await tx.vendorOnboardingDocument.deleteMany({ where: { vendorId: vendor.id } });
      await tx.vendor.delete({ where: { id: vendor.id } });
      await tx.user.delete({ where: { id: vendor.userId } });
      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin.vendor.permanent_delete",
          entityType: "Vendor",
          entityId: vendor.id,
          newValue: {
            businessName: vendor.businessName,
            cleanupSafety: safety
          } as Prisma.InputJsonValue
        }
      });
    });

    return { vendorId: vendor.id, permanentlyDeleted: true };
  }
  riders() {
    return this.prisma.rider.findMany({ where: { deletedAt: null }, select: { id: true, riderCode: true, phoneNumber: true, vehicleType: true, availabilityStatus: true, verificationStatus: true, currentLatitude: true, currentLongitude: true, currentLocationUpdatedAt: true, user: { select: { fullName: true, accountStatus: true } } } });
  }

  auditLogs() {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { adminUser: { select: { id: true, fullName: true, phoneNumber: true, email: true, adminRole: true } } }
    });
  }

  loginActivity() {
    return this.prisma.userLoginActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { user: { select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true } } }
    });
  }

  integrationSettings() {
    const paymentsProvider = this.configValue("PAYMENTS_PROVIDER", this.configValue("PAYMENT_PROVIDER", "mock")).toLowerCase();
    const paymentsLiveEnabled = this.configFlag("PAYMENTS_LIVE_ENABLED", false);
    const squadLiveConfigured = Boolean(this.configValue("SQUAD_SECRET_KEY"))
      && this.configValue("SQUAD_MODE").toLowerCase() === "live"
      && this.configValue("SQUAD_BASE_URL").startsWith("https://")
      && !this.configValue("SQUAD_BASE_URL").toLowerCase().includes("sandbox")
      && this.configValue("SQUAD_CALLBACK_URL").startsWith("https://")
      && Boolean(this.configValue("SQUAD_WEBHOOK_SECRET"))
      && this.configFlag("SQUAD_LIVE_ACTIVATION_APPROVED", false);
    return {
      environment: this.configValue("APP_ENV", "development"),
      payments: {
        provider: paymentsProvider,
        liveEnabled: paymentsLiveEnabled,
        mockFallbackAvailable: !paymentsLiveEnabled,
        livePaymentCollectionDisabled: !paymentsLiveEnabled,
        sandboxProviders: {
          paystackConfigured: Boolean(this.configValue("PAYSTACK_SECRET_KEY")),
          monnifyConfigured: Boolean(this.configValue("MONNIFY_API_KEY")),
          squadConfigured: squadLiveConfigured || Boolean(this.configValue("SQUAD_SECRET_KEY"))
        }
      },
      utilities: {
        accelerateConfigured: Boolean(this.configValue("ACCELERATE_API_KEY")),
        liveUtilityFulfilmentEnabled: false
      },
      notifications: {
        termiiConfigured: Boolean(this.configValue("TERMII_API_KEY")),
        resendConfigured: Boolean(this.configValue("RESEND_API_KEY")),
        marketingEnabled: this.configFlag("MARKETING_ENABLED", false),
        bulkMessagingEnabled: this.configFlag("BULK_MESSAGING_ENABLED", false)
      },
      biometricReadiness: {
        credentialStorageModelReady: true,
        passwordlessLoginEnabled: this.configFlag("PASSWORDLESS_LOGIN_ENABLED", false),
        note: this.configFlag("PASSWORDLESS_LOGIN_ENABLED", false)
          ? "Passwordless readiness flag is enabled. App biometric activation must still use secure token storage and fallback login."
          : "Credential storage ready; biometric login pending app activation."
      }
    };
  }

  async createVendorActivationLink(adminUserId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, userId: true, businessName: true, deletedAt: true, user: { select: { role: true } } }
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (vendor.deletedAt) throw new BadRequestException("Trashed vendors cannot receive activation links.");
    if (vendor.user.role !== UserRole.VENDOR) throw new BadRequestException("Activation links can only be created for vendor users.");

    const token = randomBytes(40).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.vendorAccountActivation.updateMany({
        where: { vendorId: vendor.id, status: VendorActivationInvitationStatus.PENDING },
        data: { status: VendorActivationInvitationStatus.REVOKED, revokedAt: new Date() }
      });
      await tx.vendorAccountActivation.create({
        data: {
          vendorId: vendor.id,
          userId: vendor.userId,
          tokenHash: this.hashSecret(token),
          expiresAt,
          createdByAdminId: adminUserId
        }
      });
    });

    await this.audit.record(adminUserId, "admin.vendor.activation_link.created", "Vendor", vendor.id, {
      businessName: vendor.businessName,
      expiresAt: expiresAt.toISOString()
    });

    return {
      vendorId: vendor.id,
      businessName: vendor.businessName,
      expiresAt: expiresAt.toISOString(),
      activationUrl: `${this.vendorDashboardUrl()}/activate?token=${encodeURIComponent(token)}`,
      tokenVisibleOnce: true,
      deliveryWarning: "Share this activation link only through an approved secure channel. KariGO does not store the plaintext token."
    };
  }

  async vendorOnboardingDocuments(vendorId: string) {
    await this.assertVendorExists(vendorId);
    return this.prisma.vendorOnboardingDocument.findMany({
      where: { vendorId },
      orderBy: { uploadedAt: "desc" },
      include: { reviewedByAdmin: { select: { id: true, fullName: true, adminRole: true } } }
    });
  }

  async reviewVendorOnboardingDocument(adminUserId: string, vendorId: string, documentId: string, status: DocumentVerificationStatus, adminNote?: string) {
    await this.assertVendorExists(vendorId);
    const document = await this.prisma.vendorOnboardingDocument.findFirst({ where: { id: documentId, vendorId } });
    if (!document) throw new NotFoundException("Vendor onboarding document not found");
    const reviewed = await this.prisma.vendorOnboardingDocument.update({
      where: { id: document.id },
      data: {
        verificationStatus: status,
        adminNote,
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date()
      },
      include: { reviewedByAdmin: { select: { id: true, fullName: true, adminRole: true } } }
    });
    await this.audit.record(adminUserId, "admin.vendor_onboarding_document.reviewed", "VendorOnboardingDocument", document.id, {
      vendorId,
      status,
      hasAdminNote: Boolean(adminNote)
    });
    return reviewed;
  }

  async updateVendorStatus(adminUserId: string, vendorId: string, status: VendorStatus, note?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        businessName: true,
        status: true,
        deletedAt: true,
        onboardingDocuments: { select: { id: true, verificationStatus: true } }
      }
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (vendor.deletedAt) throw new BadRequestException("Trashed vendors cannot be marked operational.");
    if (status === VendorStatus.ACTIVE) {
      if (!vendor.onboardingDocuments.length) {
        throw new BadRequestException("At least one approved onboarding document is required before marking this vendor operational.");
      }
      const unapproved = vendor.onboardingDocuments.filter((document) => document.verificationStatus !== DocumentVerificationStatus.APPROVED);
      if (unapproved.length) {
        throw new BadRequestException("All submitted onboarding documents must be approved before marking this vendor operational.");
      }
    }
    const updated = await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { status },
      select: VENDOR_CLEANUP_SELECT
    });
    await this.audit.record(adminUserId, "admin.vendor.status_updated", "Vendor", vendor.id, {
      fromStatus: vendor.status,
      toStatus: status,
      note
    });
    return this.vendorCleanupView(updated);
  }

  private async findVendorForCleanup(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: VENDOR_CLEANUP_SELECT
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    return vendor;
  }

  private async assertVendorExists(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, deletedAt: true } });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (vendor.deletedAt) throw new BadRequestException("Trashed vendors cannot be reviewed for onboarding.");
    return vendor;
  }

  private vendorCleanupView(vendor: Prisma.VendorGetPayload<{ select: typeof VENDOR_CLEANUP_SELECT }>) {
    return {
      ...vendor,
      inTrash: Boolean(vendor.deletedAt),
      user: {
        ...vendor.user,
        accountStatus: vendor.user.deletedAt ? AccountStatus.DEACTIVATED : vendor.user.accountStatus
      }
    };
  }

  private async vendorCleanupSafety(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { deletedAt: true }
    });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const [orders, settlements, promoCodes, payoutAccounts, orderItems, products] = await Promise.all([
      this.prisma.order.count({ where: { vendorId } }),
      this.prisma.vendorSettlement.count({ where: { vendorId } }),
      this.prisma.promoCode.count({ where: { vendorId } }),
      this.prisma.vendorPayoutAccount.count({ where: { vendorId } }),
      this.prisma.orderItem.count({ where: { product: { vendorId } } }),
      this.prisma.product.count({ where: { vendorId } })
    ]);

    const protectedRecordCounts = { orders, settlements, promoCodes, payoutAccounts, orderItems };
    const blockedBy = [
      ...(!vendor.deletedAt ? ["Vendor must be moved to Trash before permanent deletion."] : []),
      ...(orders ? ["Vendor has order history."] : []),
      ...(settlements ? ["Vendor has settlement history."] : []),
      ...(promoCodes ? ["Vendor has promo codes."] : []),
      ...(payoutAccounts ? ["Vendor has payout account records."] : []),
      ...(orderItems ? ["Vendor products are linked to order items."] : [])
    ];

    return {
      canPermanentlyDelete: blockedBy.length === 0,
      blockedBy,
      protectedRecordCounts,
      removableCatalogRecords: { products }
    };
  }

  private dateWhere(range: { dateFrom?: string; dateTo?: string }) {
    return (range.dateFrom || range.dateTo) ? { createdAt: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } } : {};
  }
  private configValue(key: string, fallback = "") {
    const value = this.config?.get<unknown>(key);
    if (typeof value === "string") return value.trim() || fallback;
    if (typeof value === "boolean" || typeof value === "number") return String(value);
    return fallback;
  }
  private configFlag(key: string, fallback: boolean) {
    const value = this.configValue(key);
    if (!value) return fallback;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  private vendorDashboardUrl() {
    return this.configValue("VENDOR_DASHBOARD_URL", "https://vendor.karigo.com.ng").replace(/\/+$/, "");
  }
  private hashSecret(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
  private sum(values: Prisma.Decimal[]) {
    return values.reduce((total, value) => total.add(value), new Prisma.Decimal(0));
  }
  private average(values: Prisma.Decimal[]) {
    return values.length ? this.sum(values).div(values.length) : new Prisma.Decimal(0);
  }
  private countBy<T extends Record<string, unknown>>(items: T[], key: keyof T) {
    return items.reduce<Record<string, number>>((counts, item) => {
      const value = String(item[key]); counts[value] = (counts[value] ?? 0) + 1; return counts;
    }, {});
  }
  private topBy<T extends Record<string, unknown>>(items: T[], key: keyof T, name: (item: T) => string) {
    const map = new Map<string, { id: string; name: string; completedOrders: number }>();
    items.forEach((item) => { const id = String(item[key]); const current = map.get(id); map.set(id, { id, name: name(item), completedOrders: (current?.completedOrders ?? 0) + 1 }); });
    return [...map.values()].sort((a, b) => b.completedOrders - a.completedOrders).slice(0, 10);
  }
}
