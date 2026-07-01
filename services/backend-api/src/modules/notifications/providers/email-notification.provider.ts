import { Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { EmailTemplateName } from "../email/templates/template.catalogue";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

const templates: Partial<Record<NotificationType, EmailTemplateName>> = {
  ORDER_CREATED: "order-created",
  PAYMENT_SUCCESSFUL: "payment-successful",
  VENDOR_ACCEPTED_ORDER: "order-status-update",
  VENDOR_REJECTED_ORDER: "order-status-update",
  ORDER_PREPARING: "order-status-update",
  ORDER_READY_FOR_PICKUP: "order-status-update",
  RIDER_ASSIGNED: "order-status-update",
  RIDER_PICKED_UP: "order-status-update",
  RIDER_ON_THE_WAY: "order-status-update",
  RIDER_ARRIVED_DESTINATION: "order-status-update",
  ORDER_DELIVERED: "order-status-update",
  ORDER_COMPLETED: "order-completed",
  REFUND_REQUESTED: "refund-requested",
  REFUND_APPROVED: "refund-approved",
  SUPPORT_TICKET_CREATED: "support-ticket-created",
  SUPPORT_TICKET_UPDATED: "support-ticket-updated",
  SETTLEMENT_PAID: "settlement-paid",
  RIDER_EARNING_PAID: "rider-earning-paid",
  SYSTEM_ALERT: "admin-critical-alert"
};

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  async send(request: ExternalNotificationRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { fullName: true, email: true }
    });
    if (!user?.email) return { accepted: false, provider: "mock-no-recipient" };

    return this.email.sendTemplateEmail({
      to: user.email,
      templateName: templates[request.type] ?? "order-status-update",
      variables: { recipientName: user.fullName, message: request.message },
      metadata: { ...request.metadata, notificationType: request.type, userId: request.userId }
    });
  }
}
