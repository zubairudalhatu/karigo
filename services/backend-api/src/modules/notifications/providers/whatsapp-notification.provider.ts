import { Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationType, UserRole } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { WhatsAppTemplateName } from "../whatsapp/templates/whatsapp-template.catalogue";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

const templates: Partial<Record<NotificationType, WhatsAppTemplateName>> = {
  ORDER_CREATED: "karigo_order_created",
  PAYMENT_SUCCESSFUL: "karigo_payment_successful",
  VENDOR_ACCEPTED_ORDER: "karigo_vendor_accepted",
  ORDER_READY_FOR_PICKUP: "karigo_order_ready",
  RIDER_ASSIGNED: "karigo_rider_assigned",
  RIDER_PICKED_UP: "karigo_rider_picked_up",
  RIDER_ON_THE_WAY: "karigo_order_on_the_way",
  RIDER_ARRIVED_DESTINATION: "karigo_rider_arrived",
  ORDER_COMPLETED: "karigo_order_completed",
  REFUND_REQUESTED: "karigo_refund_requested",
  REFUND_APPROVED: "karigo_refund_approved",
  SUPPORT_TICKET_UPDATED: "karigo_support_updated",
  SETTLEMENT_PAID: "karigo_settlement_paid",
  RIDER_EARNING_PAID: "karigo_rider_earning_paid"
};

@Injectable()
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;

  constructor(private readonly prisma: PrismaService, private readonly whatsapp: WhatsAppService) {}

  async send(request: ExternalNotificationRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { fullName: true, phoneNumber: true, role: true }
    });
    if (!user?.phoneNumber) return { accepted: false, provider: "mock-no-recipient" };

    const templateName = this.resolveTemplate(request.type, user.role);
    if (!templateName) return { accepted: false, provider: "mock-unsupported-template" };
    const reference = request.metadata?.orderReference ?? request.metadata?.ticketReference ?? request.metadata?.reference;
    const entityReference = request.entityId;
    return this.whatsapp.sendTemplateMessage({
      to: user.phoneNumber,
      templateName,
      variables: {
        customer_name: user.fullName,
        order_reference: typeof reference === "string" ? reference : entityReference ?? "your order",
        ticket_reference: typeof reference === "string" ? reference : "your ticket",
      },
      metadata: { ...request.metadata, notificationType: request.type, userId: request.userId }
    });
  }

  private resolveTemplate(type: NotificationType, role: UserRole): WhatsAppTemplateName | undefined {
    if (type === NotificationType.RIDER_ASSIGNED && role === UserRole.RIDER) return "karigo_rider_new_job";
    if (type === NotificationType.PAYMENT_SUCCESSFUL && role === UserRole.VENDOR) return "karigo_vendor_new_order";
    return templates[type];
  }
}
