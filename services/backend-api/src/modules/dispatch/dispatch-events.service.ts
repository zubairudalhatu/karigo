import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class DispatchEventsService {
  private readonly logger = new Logger(DispatchEventsService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async emit(eventName: string, orderId: string, riderId?: string): Promise<void> {
    this.logger.log(`${eventName} order=${orderId}${riderId ? ` rider=${riderId}` : ""}`);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, customer: { select: { userId: true } }, rider: { select: { userId: true } } }
    });
    if (!order) return;
    const types: Record<string, NotificationType> = {
      "rider.assigned": NotificationType.RIDER_ASSIGNED,
      "rider.reassigned": NotificationType.RIDER_ASSIGNED,
      "rider.picked_up": NotificationType.RIDER_PICKED_UP,
      "rider.on_the_way": NotificationType.RIDER_ON_THE_WAY,
      "rider.arrived_destination": NotificationType.RIDER_ARRIVED_DESTINATION,
      "rider.delivered": NotificationType.ORDER_DELIVERED,
      "order.completed": NotificationType.ORDER_COMPLETED
    };
    await this.notifications.createNotification({
      userId: order.customer.userId,
      title: "Delivery update",
      message: `Order ${order.orderNumber}: ${eventName.replaceAll(".", " ").replaceAll("_", " ")}.`,
      type: types[eventName] ?? NotificationType.SYSTEM_ALERT,
      entityType: "Order",
      entityId: orderId
    });
    if (["rider.assigned", "rider.reassigned"].includes(eventName) && order.rider?.userId) {
      await this.notifications.createNotification({
        userId: order.rider.userId,
        title: "Delivery assigned",
        message: `You have been assigned order ${order.orderNumber}.`,
        type: NotificationType.RIDER_ASSIGNED,
        entityType: "Order",
        entityId: orderId
      });
    }
    if (eventName === "order.completed" && order.rider?.userId) {
      await this.notifications.createNotification({
        userId: order.rider.userId,
        title: "Rider earning recorded",
        message: `Your earning for completed order ${order.orderNumber} was recorded.`,
        type: NotificationType.ORDER_COMPLETED,
        entityType: "Order",
        entityId: orderId
      });
    }
  }
}
