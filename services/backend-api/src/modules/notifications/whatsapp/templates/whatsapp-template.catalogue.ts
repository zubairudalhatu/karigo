import { defineWhatsAppTemplate } from "./whatsapp-template.factory";

const orderVariables = ["customer_name", "order_reference"];

export const whatsappTemplates = {
  karigo_otp_fallback: defineWhatsAppTemplate({ name: "karigo_otp_fallback", purpose: "Future OTP fallback", body: "Your KariGO verification code is {{otp_code}}. It expires shortly. Do not share this code.", requiredVariables: ["otp_code"] }),
  karigo_order_created: defineWhatsAppTemplate({ name: "karigo_order_created", purpose: "Customer order confirmation", body: "Hello {{customer_name}}, your KariGO order {{order_reference}} has been created. We will update you as it progresses.", requiredVariables: orderVariables }),
  karigo_payment_successful: defineWhatsAppTemplate({ name: "karigo_payment_successful", purpose: "Customer payment confirmation", body: "Payment received for KariGO order {{order_reference}}. Your order is now being processed.", requiredVariables: ["order_reference"] }),
  karigo_vendor_accepted: defineWhatsAppTemplate({ name: "karigo_vendor_accepted", purpose: "Vendor accepted customer order", body: "Your KariGO order {{order_reference}} has been accepted by the vendor.", requiredVariables: ["order_reference"] }),
  karigo_order_ready: defineWhatsAppTemplate({ name: "karigo_order_ready", purpose: "Customer order ready update", body: "Your KariGO order {{order_reference}} is ready for pickup and rider assignment.", requiredVariables: ["order_reference"] }),
  karigo_rider_assigned: defineWhatsAppTemplate({ name: "karigo_rider_assigned", purpose: "Customer rider assignment update", body: "Your KariGO rider has been assigned for order {{order_reference}}. Please keep your phone available.", requiredVariables: ["order_reference"] }),
  karigo_rider_picked_up: defineWhatsAppTemplate({ name: "karigo_rider_picked_up", purpose: "Customer pickup update", body: "Your KariGO order {{order_reference}} has been picked up by your rider.", requiredVariables: ["order_reference"] }),
  karigo_order_on_the_way: defineWhatsAppTemplate({ name: "karigo_order_on_the_way", purpose: "Customer delivery update", body: "Your KariGO order {{order_reference}} is on the way. Please share your delivery OTP only after receiving your order.", requiredVariables: ["order_reference"] }),
  karigo_rider_arrived: defineWhatsAppTemplate({ name: "karigo_rider_arrived", purpose: "Customer rider arrival update", body: "Your KariGO rider has arrived with order {{order_reference}}. Confirm your order before sharing the delivery OTP.", requiredVariables: ["order_reference"] }),
  karigo_order_completed: defineWhatsAppTemplate({ name: "karigo_order_completed", purpose: "Customer completion confirmation", body: "Your KariGO order {{order_reference}} has been completed. Thank you for using KariGO.", requiredVariables: ["order_reference"] }),
  karigo_refund_requested: defineWhatsAppTemplate({ name: "karigo_refund_requested", purpose: "Customer refund request confirmation", body: "Your refund request for KariGO order {{order_reference}} has been received for review.", requiredVariables: ["order_reference"] }),
  karigo_refund_approved: defineWhatsAppTemplate({ name: "karigo_refund_approved", purpose: "Customer refund approval update", body: "Your refund for KariGO order {{order_reference}} has been approved.", requiredVariables: ["order_reference"] }),
  karigo_support_updated: defineWhatsAppTemplate({ name: "karigo_support_updated", purpose: "Customer support update", body: "Your KariGO support ticket {{ticket_reference}} has been updated. Open KariGO for details.", requiredVariables: ["ticket_reference"] }),
  karigo_vendor_new_order: defineWhatsAppTemplate({ name: "karigo_vendor_new_order", purpose: "Vendor new paid order alert", body: "New KariGO order {{order_reference}} received. Please open your vendor dashboard to accept or reject the order.", requiredVariables: ["order_reference"] }),
  karigo_settlement_paid: defineWhatsAppTemplate({ name: "karigo_settlement_paid", purpose: "Vendor settlement paid update", body: "A KariGO vendor settlement has been marked paid. Open your vendor dashboard for details.", requiredVariables: [] }),
  karigo_rider_new_job: defineWhatsAppTemplate({ name: "karigo_rider_new_job", purpose: "Rider assigned job alert", body: "New KariGO delivery job assigned: {{order_reference}}. Please open your rider app for details.", requiredVariables: ["order_reference"] }),
  karigo_rider_earning_paid: defineWhatsAppTemplate({ name: "karigo_rider_earning_paid", purpose: "Rider earning paid update", body: "A KariGO rider earning has been marked paid. Open your rider app for details.", requiredVariables: [] })
} as const;

export type WhatsAppTemplateName = keyof typeof whatsappTemplates;
