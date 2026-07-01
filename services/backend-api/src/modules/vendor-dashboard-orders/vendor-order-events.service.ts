import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VendorOrderEventsService {
  private readonly logger = new Logger(VendorOrderEventsService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async emit(eventName: string, orderId: string, vendorId: string): Promise<void> {
    this.logger.log(`${eventName} order=${orderId} vendor=${vendorId}`);
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true, customer: { select: { userId: true } } } });
    if (!order) return;
    const types: Record<string, NotificationType> = {
      "vendor.order.accepted": NotificationType.VENDOR_ACCEPTED_ORDER,
      "vendor.order.rejected": NotificationType.VENDOR_REJECTED_ORDER,
      "vendor.order.preparing": NotificationType.ORDER_PREPARING,
      "vendor.order.ready_for_pickup": NotificationType.ORDER_READY_FOR_PICKUP
    };
    await this.notifications.createNotification({
      userId: order.customer.userId,
      title: "Order update",
      message: `Order ${order.orderNumber} is now ${eventName.replace("vendor.order.", "").replaceAll("_", " ")}.`,
      type: types[eventName] ?? NotificationType.SYSTEM_ALERT,
      entityType: "Order",
      entityId: orderId
    });
  }
}
