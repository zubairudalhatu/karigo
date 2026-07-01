import { Injectable, NotFoundException } from "@nestjs/common";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  SettlementStatus,
  SupportTicketStatus,
  UserRole,
  VendorStatus
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { ReportDateRangeDto } from "./dto/report-date-range.dto";

const CLOSED_ORDERS = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED, OrderStatus.REFUNDED];

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

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
        totalAmount: true, createdAt: true, updatedAt: true,
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

  users() {
    return this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, phoneNumber: true, email: true, role: true, adminRole: true, accountStatus: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  }
  vendors() {
    return this.prisma.vendor.findMany({ where: { deletedAt: null }, select: { id: true, businessName: true, businessCategory: true, city: true, state: true, status: true, isOpen: true, totalOrders: true, user: { select: { accountStatus: true } } } });
  }
  riders() {
    return this.prisma.rider.findMany({ where: { deletedAt: null }, select: { id: true, riderCode: true, phoneNumber: true, vehicleType: true, availabilityStatus: true, verificationStatus: true, currentLatitude: true, currentLongitude: true, currentLocationUpdatedAt: true, user: { select: { fullName: true, accountStatus: true } } } });
  }

  private dateWhere(range: { dateFrom?: string; dateTo?: string }) {
    return (range.dateFrom || range.dateTo) ? { createdAt: { ...(range.dateFrom ? { gte: new Date(range.dateFrom) } : {}), ...(range.dateTo ? { lte: new Date(range.dateTo) } : {}) } } : {};
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
