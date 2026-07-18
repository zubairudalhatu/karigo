import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ListVendorOrdersQueryDto } from "./dto/list-vendor-orders-query.dto";
import { RejectVendorOrderDto } from "./dto/reject-vendor-order.dto";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";

@Injectable()
export class VendorDashboardOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusService: VendorOrderStatusService,
    private readonly events: VendorOrderEventsService
  ) {}

  async list(userId: string, query: ListVendorOrdersQueryDto) {
    const vendor = await this.requireVendor(userId);
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        ...(query.status ? { orderStatus: query.status } : {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
        ...(query.search ? { orderNumber: { contains: query.search, mode: "insensitive" } } : {}),
        ...((query.dateFrom || query.dateTo)
          ? {
              createdAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
              }
            }
          : {})
      },
      select: {
        id: true,
        orderNumber: true,
        serviceCategory: true,
        orderStatus: true,
        paymentStatus: true,
        paymentMethod: true,
        cashCollectionStatus: true,
        cashCollectedAmount: true,
        cashCollectedAt: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { user: { select: { fullName: true } } } },
        deliveryAddress: { select: { label: true, addressLine: true, city: true, state: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: this.maskName(order.customer.user.fullName),
      serviceCategory: order.serviceCategory,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      cashCollectionStatus: order.cashCollectionStatus,
      cashCollectedAmount: order.cashCollectedAmount,
      cashCollectedAt: order.cashCollectedAt,
      totalAmount: order.totalAmount,
      deliveryAddress: this.addressSummary(order.deliveryAddress),
      createdAt: order.createdAt,
      itemsCount: order._count.items,
      preparationStatus: this.preparationStatus(order.orderStatus),
      availableActions: this.statusService.actionsFor(order.orderStatus)
    }));
  }

  async detail(userId: string, orderId: string) {
    const order = await this.requireOwnedOrder(userId, orderId);
    return {
      ...order,
      customer: {
        name: order.customer.user.fullName,
        phoneNumber: this.maskPhone(order.customer.user.phoneNumber)
      },
      rider: order.rider ? { id: order.rider.id, riderCode: order.rider.riderCode } : null,
      availableActions: this.statusService.actionsFor(order.orderStatus)
    };
  }

  accept(userId: string, orderId: string) {
    return this.transition(userId, orderId, OrderStatus.VENDOR_ACCEPTED, "Vendor accepted order");
  }

  preparing(userId: string, orderId: string) {
    return this.transition(userId, orderId, OrderStatus.PREPARING, "Vendor started preparing order");
  }

  ready(userId: string, orderId: string) {
    return this.transition(userId, orderId, OrderStatus.READY_FOR_PICKUP, "Vendor marked order ready for pickup");
  }

  async reject(userId: string, orderId: string, dto: RejectVendorOrderDto) {
    const order = await this.requireOwnedOrder(userId, orderId);
    this.statusService.assertTransition(order.orderStatus, OrderStatus.VENDOR_REJECTED);
    const note = `Vendor rejected order: ${dto.reason}${dto.details ? ` - ${dto.details}` : ""}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
        await tx.payment.updateMany({
          where: { orderId: order.id, paymentStatus: PaymentStatus.SUCCESSFUL },
          data: { paymentStatus: PaymentStatus.REFUND_PENDING }
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: OrderStatus.VENDOR_REJECTED,
          cancellationReason: note,
          ...(order.paymentStatus === PaymentStatus.SUCCESSFUL
            ? { paymentStatus: PaymentStatus.REFUND_PENDING }
            : {}),
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: OrderStatus.VENDOR_REJECTED,
              changedByUserId: userId,
              changedByRole: "VENDOR",
              note
            }
          }
        },
        include: this.detailInclude()
      });
    });

    await this.events.emit("vendor.order.rejected", updated.id, updated.vendorId!);
    return { ...updated, refundReviewRequired: order.paymentStatus === PaymentStatus.SUCCESSFUL };
  }

  private async transition(userId: string, orderId: string, nextStatus: OrderStatus, note: string) {
    const order = await this.requireOwnedOrder(userId, orderId);
    this.statusService.assertTransition(order.orderStatus, nextStatus);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: nextStatus,
        statusHistory: {
          create: {
            previousStatus: order.orderStatus,
            newStatus: nextStatus,
            changedByUserId: userId,
            changedByRole: "VENDOR",
            note
          }
        }
      },
      include: this.detailInclude()
    });
    await this.events.emit(this.eventFor(nextStatus), updated.id, updated.vendorId!);
    return updated;
  }

  private async requireVendor(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }
    return vendor;
  }

  private async requireOwnedOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendor: { userId, deletedAt: null } },
      include: this.detailInclude()
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  private detailInclude() {
    return {
      customer: { select: { user: { select: { fullName: true, phoneNumber: true } } } },
      deliveryAddress: {
        select: { label: true, addressLine: true, city: true, state: true, deliveryNote: true }
      },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          unitPrice: true,
          quantity: true,
          totalPrice: true,
          specialInstruction: true
        }
      },
      statusHistory: { orderBy: { createdAt: "asc" as const } },
      rider: { select: { id: true, riderCode: true } }
    };
  }

  private maskName(fullName: string): string {
    const [firstName = "Customer"] = fullName.trim().split(/\s+/);
    return `${firstName} ${fullName.trim().includes(" ") ? "****" : ""}`.trim();
  }

  private maskPhone(phoneNumber: string): string {
    return phoneNumber.length > 4
      ? `${"*".repeat(Math.max(phoneNumber.length - 4, 4))}${phoneNumber.slice(-4)}`
      : "****";
  }

  private addressSummary(address: {
    label: string;
    addressLine: string;
    city: string;
    state: string;
  } | null): string | null {
    return address ? `${address.label}: ${address.addressLine}, ${address.city}, ${address.state}` : null;
  }

  private preparationStatus(status: OrderStatus): string {
    if (status === OrderStatus.READY_FOR_PICKUP) return "READY";
    if (status === OrderStatus.PREPARING) return "PREPARING";
    if (status === OrderStatus.VENDOR_ACCEPTED) return "ACCEPTED";
    return "NOT_STARTED";
  }

  private eventFor(status: OrderStatus): string {
    const events: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.VENDOR_ACCEPTED]: "vendor.order.accepted",
      [OrderStatus.PREPARING]: "vendor.order.preparing",
      [OrderStatus.READY_FOR_PICKUP]: "vendor.order.ready_for_pickup"
    };
    return events[status] ?? "vendor.order.updated";
  }
}
