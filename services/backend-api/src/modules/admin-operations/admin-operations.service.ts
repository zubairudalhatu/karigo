import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  CaptainApplicationDocumentType,
  CaptainDocumentUploadStatus,
  CaptainWorkMode,
  DeliveryCaptainApplicationStatus,
  CashCollectionStatus,
  DocumentVerificationStatus,
  OrderPaymentMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  SupportTicketStatus,
  TaxiDriverProfileStatus,
  UserRole,
  VendorActivationInvitationStatus,
  VendorStatus
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AccountLifecycleAction } from "./dto/account-lifecycle-action.dto";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { ReportDateRangeDto } from "./dto/report-date-range.dto";

const CLOSED_ORDERS = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED, OrderStatus.REFUNDED];
type AdminCaptainAvailabilityReasonCode =
  | "AVAILABLE"
  | "APPLICATION_NOT_APPROVED"
  | "ACTIVATION_PENDING"
  | "PROFILE_INACTIVE"
  | "LOCATION_STALE"
  | "ACTIVE_DELIVERY_LOCK"
  | "ACTIVE_RIDE_LOCK"
  | "SUSPENDED";
type AdminCaptainAvailabilityEligibility = { eligible: boolean; reasonCode: AdminCaptainAvailabilityReasonCode; reason: string | null };

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
    private readonly applicationNotifications: ApplicationNotificationsService,
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
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
  }
  vendors() {
    return this.prisma.vendor.findMany({
      where: { deletedAt: null },
      select: VENDOR_CLEANUP_SELECT,
      orderBy: { createdAt: "desc" }
    }).then(async (vendors) => Promise.all(vendors.map(async (vendor) => ({
      ...this.vendorCleanupView(vendor),
      trashSafety: await this.vendorTrashSafety(vendor.id)
    }))));
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
    const trashSafety = await this.vendorTrashSafety(vendor.id);
    if (!trashSafety.canMoveToTrash) {
      throw new BadRequestException({
        message: "Vendor cannot be moved to Trash while it has catalog products or live orders. Use suspend/archive controls first and complete or cancel live orders.",
        details: trashSafety
      });
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
      businessName: vendor.businessName,
      trashSafety
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

  async permanentlyDeleteVendor(adminUserId: string, vendorId: string, confirmation: "DELETE" | "PERMANENTLY DELETE") {
    if (confirmation !== "DELETE" && confirmation !== "PERMANENTLY DELETE") {
      throw new BadRequestException("Type DELETE to permanently delete this partner account.");
    }
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
    return this.prisma.rider.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        riderCode: true,
        phoneNumber: true,
        vehicleType: true,
        availabilityStatus: true,
        verificationStatus: true,
        currentLatitude: true,
        currentLongitude: true,
        currentLocationUpdatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            accountStatus: true,
            phoneVerified: true,
            passwordHash: true,
            onboardingPasswordSetAt: true,
            deliveryCaptainApplications: {
              select: { id: true, applicationReference: true, status: true, createdAt: true, updatedAt: true },
              orderBy: { createdAt: "desc" },
              take: 1
            },
            taxiDriverApplications: {
              select: { id: true, applicationReference: true, status: true, createdAt: true, updatedAt: true },
              orderBy: { createdAt: "desc" },
              take: 1
            },
            taxiDriverProfiles: {
              select: { id: true, applicationId: true, status: true, isAvailableForTaxi: true, updatedAt: true },
              orderBy: { createdAt: "desc" },
              take: 1
            },
            captainWorkState: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }).then((riders) => riders.map((rider) => {
      const passwordCreated = Boolean(rider.user.passwordHash) || Boolean(rider.user.onboardingPasswordSetAt);
      const latestDeliveryApplication = rider.user.deliveryCaptainApplications[0] ?? null;
      const latestRideApplication = rider.user.taxiDriverApplications[0] ?? null;
      const rideProfile = rider.user.taxiDriverProfiles[0] ?? null;
      const baseDeliveryEligibility = this.adminDeliveryEligibility(rider.user, rider.verificationStatus);
      const baseRideEligibility = this.adminRideEligibility(rider.user, rideProfile?.status ?? null);
      const deliveryEligibility = rider.user.captainWorkState
        ? this.adminModeEligibilityWithState(baseDeliveryEligibility, rider.user.captainWorkState, CaptainWorkMode.DELIVERY)
        : baseDeliveryEligibility;
      const rideEligibility = rider.user.captainWorkState
        ? this.adminModeEligibilityWithState(baseRideEligibility, rider.user.captainWorkState, CaptainWorkMode.RIDE)
        : baseRideEligibility;
      return {
        ...rider,
        currentLocationUpdatedAt: rider.currentLocationUpdatedAt?.toISOString() ?? null,
        user: {
          id: rider.user.id,
          fullName: rider.user.fullName,
          accountStatus: rider.user.accountStatus,
          phoneVerified: rider.user.phoneVerified,
          passwordCreated,
          loginReady: rider.user.accountStatus === AccountStatus.ACTIVE && rider.user.phoneVerified && passwordCreated
        },
        deliveryApplication: latestDeliveryApplication ? {
          ...latestDeliveryApplication,
          createdAt: latestDeliveryApplication.createdAt.toISOString(),
          updatedAt: latestDeliveryApplication.updatedAt.toISOString()
        } : null,
        rideApplication: latestRideApplication ? {
          ...latestRideApplication,
          createdAt: latestRideApplication.createdAt.toISOString(),
          updatedAt: latestRideApplication.updatedAt.toISOString()
        } : null,
        rideProfile: rideProfile ? {
          ...rideProfile,
          updatedAt: rideProfile.updatedAt.toISOString()
        } : null,
        workState: rider.user.captainWorkState ? {
          desiredDeliveryOnline: rider.user.captainWorkState.desiredDeliveryOnline,
          desiredRideOnline: rider.user.captainWorkState.desiredRideOnline,
          effectiveDeliveryOnline: rider.user.captainWorkState.desiredDeliveryOnline && !rider.user.captainWorkState.activeWorkMode && deliveryEligibility.eligible,
          effectiveRideOnline: rider.user.captainWorkState.desiredRideOnline && !rider.user.captainWorkState.activeWorkMode && rideEligibility.eligible,
          activeWorkMode: rider.user.captainWorkState.activeWorkMode,
          activeDeliveryAssignmentId: rider.user.captainWorkState.activeDeliveryAssignmentId,
          activeRideTripId: rider.user.captainWorkState.activeRideTripId,
          activeWorkReference: rider.user.captainWorkState.activeWorkMode === "DELIVERY"
            ? rider.user.captainWorkState.activeDeliveryAssignmentId
            : rider.user.captainWorkState.activeRideTripId,
          lockStage: rider.user.captainWorkState.lockStage,
          lockedAt: rider.user.captainWorkState.lockedAt?.toISOString() ?? null,
          lastAvailabilityChangeAt: rider.user.captainWorkState.lastAvailabilityChangeAt?.toISOString() ?? null,
          lastLocationAt: rider.user.captainWorkState.lastLocationAt?.toISOString() ?? null,
          deliveryEligibility,
          rideEligibility
        } : null,
        operationalModes: [
          rider.verificationStatus === RiderStatus.ACTIVE ? "DELIVERY_CAPTAIN" : null,
          rideProfile?.status === TaxiDriverProfileStatus.ACTIVE ? "RIDE_CAPTAIN" : null
        ].filter(Boolean)
      };
    }));
  }

  private adminDeliveryEligibility(
    user: { accountStatus: AccountStatus; phoneVerified: boolean | null },
    verificationStatus: RiderStatus
  ): AdminCaptainAvailabilityEligibility {
    if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified) {
      return { eligible: false, reasonCode: "SUSPENDED", reason: "Captain account is not active and phone-verified." };
    }
    if (verificationStatus === RiderStatus.ACTIVE) return { eligible: true, reasonCode: "AVAILABLE", reason: null };
    if (verificationStatus === RiderStatus.PENDING_APPROVAL) {
      return { eligible: false, reasonCode: "ACTIVATION_PENDING", reason: "Delivery Captain activation is pending." };
    }
    return { eligible: false, reasonCode: "PROFILE_INACTIVE", reason: "Delivery Captain profile is not active." };
  }

  private adminRideEligibility(
    user: { accountStatus: AccountStatus; phoneVerified: boolean | null },
    profileStatus?: TaxiDriverProfileStatus | null
  ): AdminCaptainAvailabilityEligibility {
    if (!profileStatus) {
      return { eligible: false, reasonCode: "APPLICATION_NOT_APPROVED", reason: "Ride Captain profile is not prepared." };
    }
    if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified) {
      return { eligible: false, reasonCode: "SUSPENDED", reason: "Captain account is not active and phone-verified." };
    }
    if (profileStatus === TaxiDriverProfileStatus.ACTIVE) return { eligible: true, reasonCode: "AVAILABLE", reason: null };
    if (profileStatus === TaxiDriverProfileStatus.PENDING_ACTIVATION) {
      return { eligible: false, reasonCode: "ACTIVATION_PENDING", reason: "Ride Captain activation is pending." };
    }
    return { eligible: false, reasonCode: "PROFILE_INACTIVE", reason: "Ride Captain profile is not active." };
  }

  private adminModeEligibilityWithState(
    eligibility: AdminCaptainAvailabilityEligibility,
    state: {
      activeWorkMode: CaptainWorkMode | null;
      desiredDeliveryOnline: boolean;
      desiredRideOnline: boolean;
      lastLocationAt: Date | null;
    },
    mode: CaptainWorkMode
  ): AdminCaptainAvailabilityEligibility {
    if (!eligibility.eligible) return eligibility;
    if (state.activeWorkMode && state.activeWorkMode !== mode) {
      return state.activeWorkMode === CaptainWorkMode.DELIVERY
        ? { eligible: false, reasonCode: "ACTIVE_DELIVERY_LOCK", reason: "Paused while a Delivery assignment is active." }
        : { eligible: false, reasonCode: "ACTIVE_RIDE_LOCK", reason: "Paused while a Ride assignment is active." };
    }
    if (this.adminCaptainLocationIsStale(state, mode)) {
      return { eligible: false, reasonCode: "LOCATION_STALE", reason: "Update device GPS before going online." };
    }
    return eligibility;
  }

  private adminCaptainLocationIsStale(
    state: { activeWorkMode: CaptainWorkMode | null; desiredDeliveryOnline: boolean; desiredRideOnline: boolean; lastLocationAt: Date | null },
    mode: CaptainWorkMode
  ) {
    if (state.activeWorkMode) return false;
    const desiredOnline = mode === CaptainWorkMode.DELIVERY ? state.desiredDeliveryOnline : state.desiredRideOnline;
    if (!desiredOnline) return false;
    if (!state.lastLocationAt) return true;
    const seconds = Number(process.env.CAPTAIN_LOCATION_STALE_SECONDS ?? process.env.RIDES_CAPTAIN_LOCATION_STALE_SECONDS ?? 90);
    const staleMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 90_000;
    return Date.now() - state.lastLocationAt.getTime() > staleMs;
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
    const flutterwaveV4CredentialsConfigured = Boolean(this.configValue("FLUTTERWAVE_CLIENT_ID"))
      && Boolean(this.configValue("FLUTTERWAVE_CLIENT_SECRET"));
    const flutterwaveLiveConfigured = flutterwaveV4CredentialsConfigured
      && this.configValue("FLUTTERWAVE_ENVIRONMENT").toLowerCase() === "live"
      && this.configValue("FLUTTERWAVE_BASE_URL", "https://f4bexperience.flutterwave.com").startsWith("https://")
      && !this.configValue("FLUTTERWAVE_BASE_URL", "https://f4bexperience.flutterwave.com").toLowerCase().includes("sandbox")
      && (this.configValue("FLUTTERWAVE_REDIRECT_URL").startsWith("https://") || this.configValue("FLUTTERWAVE_CALLBACK_URL").startsWith("https://"))
      && (Boolean(this.configValue("FLUTTERWAVE_SECRET_HASH")) || Boolean(this.configValue("FLUTTERWAVE_WEBHOOK_SECRET")))
      && this.configFlag("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED", false);
    const squadLiveConfigured = Boolean(this.configValue("SQUAD_SECRET_KEY"))
      && this.configValue("SQUAD_MODE").toLowerCase() === "live"
      && this.configValue("SQUAD_BASE_URL").startsWith("https://")
      && !this.configValue("SQUAD_BASE_URL").toLowerCase().includes("sandbox")
      && this.configValue("SQUAD_CALLBACK_URL").startsWith("https://")
      && Boolean(this.configValue("SQUAD_WEBHOOK_SECRET"))
      && this.configFlag("SQUAD_LIVE_ACTIVATION_APPROVED", false);
    const acceleratePublicKeyConfigured = Boolean(this.configValue("ACCELERATE_API_PUBLIC_KEY") || this.configValue("ACCELERATE_API_KEY"));
    const acceleratePrivateKeyConfigured = Boolean(this.configValue("ACCELERATE_API_PRIVATE_KEY") || this.configValue("ACCELERATE_API_SECRET"));
    return {
      environment: this.configValue("APP_ENV", "development"),
      payments: {
        provider: paymentsProvider,
        liveEnabled: paymentsLiveEnabled,
        mockFallbackAvailable: !paymentsLiveEnabled,
        livePaymentCollectionDisabled: !paymentsLiveEnabled,
        sandboxProviders: {
          flutterwaveConfigured: flutterwaveLiveConfigured || flutterwaveV4CredentialsConfigured,
          paystackConfigured: Boolean(this.configValue("PAYSTACK_SECRET_KEY")),
          monnifyConfigured: Boolean(this.configValue("MONNIFY_API_KEY")),
          squadConfigured: squadLiveConfigured || Boolean(this.configValue("SQUAD_SECRET_KEY"))
        },
        wallet: {
          walletTopUpEnabled: this.configFlag("WALLET_TOP_UP_ENABLED", false),
          walletPaymentsEnabled: this.configFlag("WALLET_PAYMENTS_ENABLED", false),
          providerForTopUp: "Flutterwave",
          backendVerificationRequired: true,
          clientSideCreditDisabled: true,
          minimumTopUpAmount: this.configNumber("WALLET_MIN_TOP_UP_AMOUNT", 100),
          note: this.configFlag("WALLET_TOP_UP_ENABLED", false)
            ? "Wallet top-up is configured by env, but customer top-up remains disabled until Flutterwave wallet verification is separately approved."
            : "Wallet top-up remains disabled until WALLET_TOP_UP_ENABLED is set after verification approval."
        }
      },
      utilities: {
        accelerateConfigured: acceleratePublicKeyConfigured && acceleratePrivateKeyConfigured,
        liveUtilityFulfilmentEnabled: this.configFlag("UTILITIES_LIVE_FULFILLMENT_ENABLED", false),
        walletPaymentEnabled: this.configFlag("UTILITIES_WALLET_PAYMENT_ENABLED", false)
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
          ? "Passwordless readiness flag is enabled. Customer and Captain apps use device biometrics only to refresh saved backend sessions with secure token storage and fallback login."
          : "Customer and Captain biometric refresh sign-in is implemented, but public activation remains controlled by PASSWORDLESS_LOGIN_ENABLED."
      }
    };
  }

  async createVendorActivationLink(adminUserId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        userId: true,
        businessName: true,
        deletedAt: true,
        user: { select: { role: true, fullName: true, phoneNumber: true, email: true } }
      }
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

    const activationUrl = `${this.vendorDashboardUrl()}/activate?token=${encodeURIComponent(token)}`;
    await this.applicationNotifications.vendorApplicationReviewed({
      reference: `VENDOR-${vendor.id.slice(0, 8).toUpperCase()}`,
      recipientName: vendor.user.fullName || vendor.businessName,
      phoneNumber: vendor.user.phoneNumber,
      email: vendor.user.email,
      status: "APPROVED",
      activationUrl,
      activationExpiresAt: expiresAt.toISOString()
    });

    return {
      vendorId: vendor.id,
      businessName: vendor.businessName,
      expiresAt: expiresAt.toISOString(),
      tokenVisibleOnce: false,
      notificationQueued: true,
      deliveryWarning: "A secure password setup link was sent through approved application notification channels. KariGO does not expose the plaintext token in Admin Portal."
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
        userId: true,
        businessName: true,
        status: true,
        deletedAt: true,
        onboardingDocuments: { select: { id: true, verificationStatus: true } },
        user: { select: { accountStatus: true, deletedAt: true } }
      }
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (vendor.deletedAt) throw new BadRequestException("Trashed vendors cannot be marked operational.");
    if (vendor.status === status) throw new BadRequestException(`Vendor is already ${status.replaceAll("_", " ")}.`);
    if (status === VendorStatus.SUSPENDED) {
      return this.updateVendorLifecycle(adminUserId, vendorId, "SUSPEND", this.requiredReason(note, "Vendor suspension requires a reason."));
    }
    if (vendor.status === VendorStatus.SUSPENDED && status === VendorStatus.ACTIVE) {
      return this.updateVendorLifecycle(adminUserId, vendorId, "REACTIVATE", this.requiredReason(note, "Vendor reactivation requires a reason."));
    }
    if (status === VendorStatus.CLOSED || status === VendorStatus.REJECTED) {
      this.requiredReason(note, "Vendor closure or rejection requires a reason.");
    }
    if (status === VendorStatus.ACTIVE) {
      if (vendor.status !== VendorStatus.PENDING_APPROVAL) {
        throw new BadRequestException("Only pending vendors can be marked operational through this action. Use reactivation for suspended vendors.");
      }
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
      data: {
        status,
        ...(status === VendorStatus.ACTIVE ? { isOpen: false } : {})
      },
      select: VENDOR_CLEANUP_SELECT
    });
    await this.audit.record(adminUserId, "admin.vendor.status_updated", "Vendor", vendor.id, {
      fromStatus: vendor.status,
      toStatus: status,
      note
    });
    return this.vendorCleanupView(updated);
  }

  async updateVendorLifecycle(adminUserId: string, vendorId: string, action: AccountLifecycleAction, reason: string) {
    const safeReason = this.requiredReason(reason, "Vendor lifecycle action requires a reason.");
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        userId: true,
        businessName: true,
        status: true,
        deletedAt: true,
        user: { select: { accountStatus: true, deletedAt: true } }
      }
    });
    if (!vendor) throw new NotFoundException("Vendor not found");
    if (vendor.deletedAt || vendor.user.deletedAt) throw new BadRequestException("Trashed vendors cannot be changed through lifecycle controls.");

    const now = new Date();
    if (action === "SUSPEND") {
      if (vendor.status !== VendorStatus.ACTIVE || vendor.user.accountStatus !== AccountStatus.ACTIVE) {
        throw new BadRequestException("Only active vendors can be suspended.");
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: vendor.userId }, data: { accountStatus: AccountStatus.SUSPENDED } });
        await tx.vendor.update({ where: { id: vendor.id }, data: { status: VendorStatus.SUSPENDED, isOpen: false } });
        await this.revokeUserSessions(tx, vendor.userId, now);
        return tx.vendor.findUniqueOrThrow({ where: { id: vendor.id }, select: VENDOR_CLEANUP_SELECT });
      });
      await this.audit.record(adminUserId, "admin.vendor.suspended", "Vendor", vendor.id, {
        reason: safeReason,
        previousStatus: vendor.status,
        newStatus: VendorStatus.SUSPENDED,
        previousAccountStatus: vendor.user.accountStatus,
        newAccountStatus: AccountStatus.SUSPENDED,
        sessionRevoked: true
      });
      return this.vendorCleanupView(updated);
    }

    if (action !== "REACTIVATE") {
      throw new BadRequestException("Unsupported vendor lifecycle action.");
    }

    if (vendor.status !== VendorStatus.SUSPENDED) {
      throw new BadRequestException("Only suspended vendors can be reactivated.");
    }
    if (vendor.user.accountStatus === AccountStatus.BLOCKED || vendor.user.accountStatus === AccountStatus.DEACTIVATED) {
      throw new BadRequestException("Blocked or deactivated vendor users cannot be reactivated through this action.");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: vendor.userId }, data: { accountStatus: AccountStatus.ACTIVE } });
      await tx.vendor.update({ where: { id: vendor.id }, data: { status: VendorStatus.ACTIVE, isOpen: false } });
      return tx.vendor.findUniqueOrThrow({ where: { id: vendor.id }, select: VENDOR_CLEANUP_SELECT });
    });
    await this.audit.record(adminUserId, "admin.vendor.reactivated", "Vendor", vendor.id, {
      reason: safeReason,
      previousStatus: vendor.status,
      newStatus: VendorStatus.ACTIVE,
      previousAccountStatus: vendor.user.accountStatus,
      newAccountStatus: AccountStatus.ACTIVE,
      operationalNote: "Vendor is reactivated but remains closed until the Partner opens the workspace."
    });
    return this.vendorCleanupView(updated);
  }

  async updateRiderLifecycle(adminUserId: string, riderId: string, action: AccountLifecycleAction, reason: string) {
    const safeReason = this.requiredReason(reason, "Captain lifecycle action requires a reason.");
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        userId: true,
        riderCode: true,
        verificationStatus: true,
        availabilityStatus: true,
        deletedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            accountStatus: true,
            phoneVerified: true,
            passwordHash: true,
            onboardingPasswordSetAt: true,
            deletedAt: true,
            deliveryCaptainApplications: {
              select: {
                id: true,
                applicationReference: true,
                status: true,
                captainDocuments: { orderBy: { uploadedAt: "desc" } }
              },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });
    if (!rider) throw new NotFoundException("Captain not found");
    if (rider.deletedAt || rider.user.deletedAt) throw new BadRequestException("Deleted captains cannot be changed through lifecycle controls.");

    const now = new Date();
    if (action === "ACTIVATE") {
      if (rider.verificationStatus !== RiderStatus.PENDING_APPROVAL) {
        throw new BadRequestException("Only pending Delivery Captains can be activated.");
      }
      const passwordCreated = Boolean(rider.user.passwordHash) || Boolean(rider.user.onboardingPasswordSetAt);
      if (rider.user.accountStatus !== AccountStatus.ACTIVE || !rider.user.phoneVerified || !passwordCreated) {
        throw new BadRequestException("Captain account must be active, phone verified and login ready before activation.");
      }
      const application = rider.user.deliveryCaptainApplications[0] ?? null;
      if (!application || application.status !== DeliveryCaptainApplicationStatus.APPROVED) {
        throw new BadRequestException("Delivery Captain application must be approved before operational activation.");
      }
      const requiredDeliveryDocumentTypes = [CaptainApplicationDocumentType.PROFILE_PHOTO];
      const requiredDocumentsApproved = requiredDeliveryDocumentTypes.every((documentType) =>
        application.captainDocuments.some((document) =>
          document.documentType === documentType &&
          document.uploadStatus === CaptainDocumentUploadStatus.UPLOADED &&
          !document.deletedAt &&
          document.reviewStatus === DocumentVerificationStatus.APPROVED
        )
      );
      if (!requiredDocumentsApproved) {
        throw new BadRequestException({
          message: "Required Delivery Captain documents must be approved before activation.",
          errorCode: "REQUIRED_DOCUMENT_REVIEW_INCOMPLETE",
          incompleteDocumentTypes: requiredDeliveryDocumentTypes
        });
      }
      const updated = await this.prisma.rider.update({
        where: { id: rider.id },
        data: { verificationStatus: RiderStatus.ACTIVE, availabilityStatus: RiderStatus.OFFLINE },
        select: {
          id: true,
          riderCode: true,
          phoneNumber: true,
          vehicleType: true,
          availabilityStatus: true,
          verificationStatus: true,
          currentLatitude: true,
          currentLongitude: true,
          currentLocationUpdatedAt: true,
          user: { select: { id: true, fullName: true, accountStatus: true } }
        }
      });
      await this.audit.record(adminUserId, "DELIVERY_CAPTAIN_ACTIVATED", "Rider", rider.id, {
        reason: safeReason,
        applicationId: application.id,
        applicationReference: application.applicationReference,
        previousStatus: rider.verificationStatus,
        newStatus: RiderStatus.ACTIVE,
        previousAvailability: rider.availabilityStatus,
        newAvailability: RiderStatus.OFFLINE
      });
      return updated;
    }

    if (action === "SUSPEND") {
      if (rider.verificationStatus !== RiderStatus.ACTIVE || rider.user.accountStatus !== AccountStatus.ACTIVE) {
        throw new BadRequestException("Only active captains can be suspended.");
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: rider.userId }, data: { accountStatus: AccountStatus.SUSPENDED } });
        await tx.rider.update({
          where: { id: rider.id },
          data: { verificationStatus: RiderStatus.SUSPENDED, availabilityStatus: RiderStatus.OFFLINE }
        });
        await this.revokeUserSessions(tx, rider.userId, now);
        return tx.rider.findUniqueOrThrow({
          where: { id: rider.id },
          select: {
            id: true,
            riderCode: true,
            phoneNumber: true,
            vehicleType: true,
            availabilityStatus: true,
            verificationStatus: true,
            currentLatitude: true,
            currentLongitude: true,
            currentLocationUpdatedAt: true,
            user: { select: { id: true, fullName: true, accountStatus: true } }
          }
        });
      });
      await this.audit.record(adminUserId, "admin.captain.suspended", "Rider", rider.id, {
        reason: safeReason,
        previousStatus: rider.verificationStatus,
        newStatus: RiderStatus.SUSPENDED,
        previousAvailability: rider.availabilityStatus,
        newAvailability: RiderStatus.OFFLINE,
        previousAccountStatus: rider.user.accountStatus,
        newAccountStatus: AccountStatus.SUSPENDED,
        sessionRevoked: true
      });
      return updated;
    }

    if (rider.verificationStatus !== RiderStatus.SUSPENDED) {
      throw new BadRequestException("Only suspended captains can be reactivated.");
    }
    if (rider.user.accountStatus === AccountStatus.BLOCKED || rider.user.accountStatus === AccountStatus.DEACTIVATED) {
      throw new BadRequestException("Blocked or deactivated captain users cannot be reactivated through this action.");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: rider.userId }, data: { accountStatus: AccountStatus.ACTIVE } });
      await tx.rider.update({
        where: { id: rider.id },
        data: { verificationStatus: RiderStatus.ACTIVE, availabilityStatus: RiderStatus.OFFLINE }
      });
      return tx.rider.findUniqueOrThrow({
        where: { id: rider.id },
        select: {
          id: true,
          riderCode: true,
          phoneNumber: true,
          vehicleType: true,
          availabilityStatus: true,
          verificationStatus: true,
          currentLatitude: true,
          currentLongitude: true,
          currentLocationUpdatedAt: true,
          user: { select: { id: true, fullName: true, accountStatus: true } }
        }
      });
    });
    await this.audit.record(adminUserId, "admin.captain.reactivated", "Rider", rider.id, {
      reason: safeReason,
      previousStatus: rider.verificationStatus,
      newStatus: RiderStatus.ACTIVE,
      previousAvailability: rider.availabilityStatus,
      newAvailability: RiderStatus.OFFLINE,
      previousAccountStatus: rider.user.accountStatus,
      newAccountStatus: AccountStatus.ACTIVE,
      operationalNote: "Captain is reactivated but remains offline until they choose to go online."
    });
    return updated;
  }

  async updateCustomerLifecycle(adminUserId: string, userId: string, action: AccountLifecycleAction, reason: string) {
    const safeReason = this.requiredReason(reason, "Customer lifecycle action requires a reason.");
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, deletedAt: true, createdAt: true }
    });
    if (!user) throw new NotFoundException("Customer account not found");
    if (user.deletedAt || user.role !== UserRole.CUSTOMER) throw new BadRequestException("Only active Customer accounts can be changed through customer lifecycle controls.");

    const now = new Date();
    if (action === "SUSPEND") {
      if (user.accountStatus !== AccountStatus.ACTIVE) throw new BadRequestException("Only active Customer accounts can be suspended.");
      const updated = await this.prisma.$transaction(async (tx) => {
        const next = await tx.user.update({
          where: { id: user.id },
          data: { accountStatus: AccountStatus.SUSPENDED },
          select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, createdAt: true }
        });
        await this.revokeUserSessions(tx, user.id, now);
        return next;
      });
      await this.audit.record(adminUserId, "admin.customer.suspended", "User", user.id, {
        reason: safeReason,
        previousAccountStatus: user.accountStatus,
        newAccountStatus: AccountStatus.SUSPENDED,
        sessionRevoked: true
      });
      return updated;
    }

    if (action !== "REACTIVATE") {
      throw new BadRequestException("Unsupported customer lifecycle action.");
    }

    if (user.accountStatus !== AccountStatus.SUSPENDED) throw new BadRequestException("Only suspended Customer accounts can be reactivated.");
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: AccountStatus.ACTIVE },
      select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, createdAt: true }
    });
    await this.audit.record(adminUserId, "admin.customer.reactivated", "User", user.id, {
      reason: safeReason,
      previousAccountStatus: user.accountStatus,
      newAccountStatus: AccountStatus.ACTIVE
    });
    return updated;
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

  private async vendorTrashSafety(vendorId: string) {
    const [activeOrders, products] = await Promise.all([
      this.prisma.order.count({ where: { vendorId, orderStatus: { notIn: CLOSED_ORDERS } } }),
      this.prisma.product.count({ where: { vendorId } })
    ]);
    const blockedBy = [
      ...(products ? ["Vendor has catalog products. Suspend/archive instead of Trash until catalog cleanup is approved."] : []),
      ...(activeOrders ? ["Vendor has live orders. Complete, cancel or reconcile those orders before Trash."] : [])
    ];
    return {
      canMoveToTrash: blockedBy.length === 0,
      blockedBy,
      recordCounts: { activeOrders, products }
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
  private configNumber(key: string, fallback: number) {
    const value = Number(this.configValue(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  private vendorDashboardUrl() {
    return this.configValue("VENDOR_DASHBOARD_URL", "https://vendor.karigo.com.ng").replace(/\/+$/, "");
  }
  private hashSecret(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
  private async revokeUserSessions(tx: Prisma.TransactionClient, userId: string, revokedAt: Date) {
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt } });
    await tx.deviceToken.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  }
  private requiredReason(reason: string | undefined, message: string) {
    const value = reason?.trim();
    if (!value || value.length < 5) {
      throw new BadRequestException(message);
    }
    return value;
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
