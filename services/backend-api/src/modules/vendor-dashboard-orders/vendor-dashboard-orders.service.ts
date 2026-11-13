import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { partnerOrderRejectionReasons } from "@karigo/shared-types";
import { PrismaService } from "../../prisma/prisma.service";
import { ListVendorOrdersQueryDto } from "./dto/list-vendor-orders-query.dto";
import { RejectVendorOrderDto } from "./dto/reject-vendor-order.dto";
import { OrderPreconditionDto } from "./dto/order-precondition.dto";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";
import { approvedOrderVendor } from "./vendor-order-access";

const detailSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true, vendorId: true, orderNumber: true, serviceCategory: true, orderStatus: true, paymentStatus: true,
  paymentMethod: true, cashCollectionStatus: true, subtotal: true, deliveryFee: true, serviceFee: true,
  discountAmount: true, totalAmount: true, createdAt: true, updatedAt: true,
  customer: { select: { user: { select: { fullName: true, phoneNumber: true } } } },
  deliveryAddress: { select: { city: true, state: true } },
  items: { select: { id: true, productName: true, unitPrice: true, quantity: true, totalPrice: true, specialInstruction: true } },
  statusHistory: { orderBy: { createdAt: "asc" }, select: { id: true, previousStatus: true, newStatus: true, changedByRole: true, note: true, createdAt: true } }
});
type MerchantOrder = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;
const unsafeNote = /[\x00-\x08\x0b-\x1f\x7f]|(?:password|passcode|otp|access.?token|refresh.?token|api.?key)\s*[:=]|bearer\s+\S+|-----BEGIN|\b(?:ghp_|sk_live_|sk-proj-)|\b\d{13,19}\b|(?:stack trace|exception:|at .*\.tsx?:\d+)/i;

@Injectable()
export class VendorDashboardOrdersService {
  private readonly logger = new Logger(VendorDashboardOrdersService.name);
  constructor(private readonly prisma: PrismaService, private readonly statusService: VendorOrderStatusService, private readonly events: VendorOrderEventsService) {}

  async list(userId: string, query: ListVendorOrdersQueryDto, accessHash?: string) {
    const vendor = await approvedOrderVendor(this.prisma, userId, accessHash);
    const orders = await this.prisma.order.findMany({ where: {
      vendorId: vendor.id, ...(query.status ? { orderStatus: query.status } : {}), ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.search ? { orderNumber: { contains: query.search, mode: "insensitive" } } : {}),
      ...((query.dateFrom || query.dateTo) ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {})
    }, select: { id: true, orderNumber: true, serviceCategory: true, orderStatus: true, paymentStatus: true,
      paymentMethod: true, cashCollectionStatus: true, totalAmount: true, createdAt: true, updatedAt: true,
      customer: { select: { user: { select: { fullName: true } } } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } });
    return orders.map(order => ({ id: order.id, orderNumber: order.orderNumber, customerName: this.maskName(order.customer.user.fullName),
      serviceCategory: order.serviceCategory, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod, cashCollectionStatus: order.cashCollectionStatus, totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), itemsCount: order._count.items,
      preparationStatus: order.orderStatus, availableActions: this.statusService.actionsFor(order.orderStatus) }));
  }

  async detail(userId: string, orderId: string, accessHash?: string) {
    const vendor = await approvedOrderVendor(this.prisma, userId, accessHash);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, vendorId: vendor.id }, select: detailSelect });
    if (!order) throw new NotFoundException("Order not found.");
    return this.merchantView(order);
  }
  accept(userId: string, id: string, condition: OrderPreconditionDto = {}, accessHash?: string) { return this.transition(userId, id, OrderStatus.VENDOR_ACCEPTED, condition, accessHash); }
  preparing(userId: string, id: string, condition: OrderPreconditionDto = {}, accessHash?: string) { return this.transition(userId, id, OrderStatus.PREPARING, condition, accessHash); }
  ready(userId: string, id: string, condition: OrderPreconditionDto = {}, accessHash?: string) { return this.transition(userId, id, OrderStatus.READY_FOR_PICKUP, condition, accessHash); }
  reject(userId: string, id: string, dto: RejectVendorOrderDto, accessHash?: string) {
    if (!partnerOrderRejectionReasons.includes(dto.reason)) throw new BadRequestException("Choose a supported rejection reason.");
    const details = dto.details?.trim();
    if (details && (details.length > 500 || unsafeNote.test(details))) throw new BadRequestException("Use a business note without credentials, payment details or diagnostic logs.");
    return this.transition(userId, id, OrderStatus.VENDOR_REJECTED, dto, accessHash, `Vendor rejected order: ${dto.reason}${details ? ` - ${details}` : ""}`);
  }

  private async transition(userId: string, orderId: string, target: OrderStatus, condition: OrderPreconditionDto, accessHash?: string, rejectionNote?: string) {
    if (Boolean(condition.expectedStatus) !== Boolean(condition.expectedUpdatedAt)) throw new BadRequestException("Supply both order state and update time.");
    const notes: Partial<Record<OrderStatus, string>> = { VENDOR_ACCEPTED: "Vendor accepted order", PREPARING: "Vendor started preparing order", READY_FOR_PICKUP: "Vendor marked order ready for pickup" };
    const note = rejectionNote ?? notes[target]!;
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text AS lock`;
      // Approval/deletion changes cannot cross the authorized transaction boundary.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR SHARE`;
      const vendor = await approvedOrderVendor(tx, userId, accessHash);
      await tx.$queryRaw`SELECT id FROM vendors WHERE id = ${vendor.id}::uuid FOR SHARE`;
      await approvedOrderVendor(tx, userId, accessHash);
      const order = await tx.order.findFirst({ where: { id: orderId, vendorId: vendor.id }, select: detailSelect });
      if (!order) throw new NotFoundException("Order not found.");
      if (condition.expectedStatus && (order.orderStatus !== condition.expectedStatus || order.updatedAt.getTime() !== new Date(condition.expectedUpdatedAt!).getTime())) throw this.changed();
      this.statusService.assertTransition(order.orderStatus, target);
      const refundReviewRequired = target === OrderStatus.VENDOR_REJECTED && order.paymentStatus === PaymentStatus.SUCCESSFUL;
      const claimed = await tx.order.updateMany({ where: { id: order.id, vendorId: vendor.id, orderStatus: order.orderStatus, updatedAt: order.updatedAt, paymentStatus: order.paymentStatus },
        data: { orderStatus: target, ...(target === OrderStatus.VENDOR_REJECTED ? { cancellationReason: note } : {}), ...(refundReviewRequired ? { paymentStatus: PaymentStatus.REFUND_PENDING } : {}) } });
      if (claimed.count !== 1) throw this.changed();
      if (refundReviewRequired) await tx.payment.updateMany({ where: { orderId, paymentStatus: PaymentStatus.SUCCESSFUL }, data: { paymentStatus: PaymentStatus.REFUND_PENDING } });
      await tx.orderStatusHistory.create({ data: { orderId, previousStatus: order.orderStatus, newStatus: target, changedByUserId: userId, changedByRole: "VENDOR", note } });
      const updated = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: detailSelect });
      const eventKey = `order:${orderId}:${updated.orderStatus}:${updated.updatedAt.toISOString()}`;
      await tx.partnerPushDelivery.upsert({ where: { eventKey }, create: { eventKey, userId, entityId: orderId, kind: "ORDER_STATUS" }, update: {} });
      return { order: updated, vendorId: vendor.id, refundReviewRequired };
    }).catch(error => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) throw this.changed();
      throw error;
    });
    const eventNames: Partial<Record<OrderStatus, string>> = { VENDOR_ACCEPTED: "vendor.order.accepted", VENDOR_REJECTED: "vendor.order.rejected", PREPARING: "vendor.order.preparing", READY_FOR_PICKUP: "vendor.order.ready_for_pickup" };
    try { await this.events.emit(eventNames[target]!, orderId, result.vendorId); }
    catch { this.logger.warn("Merchant order committed; notification delivery requires retry."); }
    return { ...this.merchantView(result.order), refundReviewRequired: result.refundReviewRequired };
  }

  private changed() { return new ConflictException({ message: "Order status changed. Refresh and review it before acting again.", error_code: "ORDER_STATE_CHANGED" }); }
  private maskName(value: string) { return `${value.trim().split(/\s+/)[0] || "Customer"} ****`; }
  private merchantView(order: MerchantOrder) {
    return { id: order.id, orderNumber: order.orderNumber, serviceCategory: order.serviceCategory, orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, cashCollectionStatus: order.cashCollectionStatus,
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), subtotal: order.subtotal.toString(), deliveryFee: order.deliveryFee.toString(),
      serviceFee: order.serviceFee.toString(), discountAmount: order.discountAmount.toString(), totalAmount: order.totalAmount.toString(), fulfilment: "COURIER_PICKUP" as const,
      customerNote: null, customer: { name: this.maskName(order.customer.user.fullName), phoneNumber: `****${order.customer.user.phoneNumber?.slice(-4) ?? ""}` },
      deliveryAddress: order.deliveryAddress ? { label: "Delivery area", addressLine: "Exact address is shared with the assigned courier", city: order.deliveryAddress.city, state: order.deliveryAddress.state, deliveryNote: null } : null,
      items: order.items.map(item => ({ ...item, unitPrice: item.unitPrice.toString(), totalPrice: item.totalPrice.toString() })),
      statusHistory: order.statusHistory.map(entry => ({ id: entry.id, previousStatus: entry.previousStatus, newStatus: entry.newStatus, changedByRole: ["VENDOR", "CUSTOMER", "RIDER", "ADMIN"].includes(entry.changedByRole) ? entry.changedByRole : "SYSTEM",
        note: entry.changedByRole === "VENDOR" && entry.note?.startsWith("Vendor ") && !unsafeNote.test(entry.note) ? entry.note : null, createdAt: entry.createdAt.toISOString() })),
      rejectionReasons: [...partnerOrderRejectionReasons], availableActions: this.statusService.actionsFor(order.orderStatus)
    };
  }
}
