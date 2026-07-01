import { NotificationType } from "@prisma/client";

export interface PushTemplate {
  name: string;
  trigger: NotificationType;
  title: string;
  body: string;
}

export const pushTemplates: Partial<Record<NotificationType, PushTemplate>> = {
  PAYMENT_SUCCESSFUL: {
    name: "payment_successful_push",
    trigger: NotificationType.PAYMENT_SUCCESSFUL,
    title: "Payment successful",
    body: "Payment received. Your KariGO order is now being processed."
  },
  VENDOR_ACCEPTED_ORDER: {
    name: "vendor_accepted_order_push",
    trigger: NotificationType.VENDOR_ACCEPTED_ORDER,
    title: "Order accepted",
    body: "The vendor has accepted your KariGO order."
  },
  ORDER_READY_FOR_PICKUP: {
    name: "order_ready_for_pickup_push",
    trigger: NotificationType.ORDER_READY_FOR_PICKUP,
    title: "Order ready for pickup",
    body: "Your order is ready and waiting for rider pickup."
  },
  RIDER_ASSIGNED: {
    name: "rider_assigned_push",
    trigger: NotificationType.RIDER_ASSIGNED,
    title: "Rider assigned",
    body: "A KariGO rider has been assigned."
  },
  RIDER_ON_THE_WAY: {
    name: "order_on_the_way_push",
    trigger: NotificationType.RIDER_ON_THE_WAY,
    title: "Order on the way",
    body: "Your KariGO order is on the way."
  },
  ORDER_COMPLETED: {
    name: "order_completed_push",
    trigger: NotificationType.ORDER_COMPLETED,
    title: "Order completed",
    body: "Your KariGO order has been completed."
  },
  REFUND_APPROVED: {
    name: "refund_approved_push",
    trigger: NotificationType.REFUND_APPROVED,
    title: "Refund approved",
    body: "Your KariGO refund request has been approved."
  },
  SUPPORT_TICKET_UPDATED: {
    name: "support_ticket_updated_push",
    trigger: NotificationType.SUPPORT_TICKET_UPDATED,
    title: "Support ticket updated",
    body: "Your KariGO support ticket has an update."
  },
  RIDER_EARNING_PAID: {
    name: "rider_earning_paid_push",
    trigger: NotificationType.RIDER_EARNING_PAID,
    title: "Earning marked paid",
    body: "A KariGO rider earning has been marked paid."
  }
};
