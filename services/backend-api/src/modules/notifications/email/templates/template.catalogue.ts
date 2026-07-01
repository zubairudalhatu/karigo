import { defineTemplate } from "./template.factory";

export const emailTemplates = {
  "welcome-customer": defineTemplate({ name: "welcome-customer", subject: "Welcome to KariGO", heading: "Welcome to KariGO" }),
  "otp-verification": defineTemplate({ name: "otp-verification", subject: "Your KariGO verification code", heading: "Verify your KariGO account" }),
  "order-created": defineTemplate({ name: "order-created", subject: "Your KariGO order has been created", heading: "Order created", actionLabel: "View order" }),
  "payment-successful": defineTemplate({ name: "payment-successful", subject: "Payment successful for your KariGO order", heading: "Payment successful", actionLabel: "View receipt" }),
  "order-status-update": defineTemplate({ name: "order-status-update", subject: "Your KariGO order status has been updated", heading: "Order status update", actionLabel: "Track order" }),
  "order-completed": defineTemplate({ name: "order-completed", subject: "Your KariGO order has been completed", heading: "Order completed" }),
  "refund-requested": defineTemplate({ name: "refund-requested", subject: "Refund request received", heading: "Refund request received" }),
  "refund-approved": defineTemplate({ name: "refund-approved", subject: "Refund approved", heading: "Refund approved" }),
  "support-ticket-created": defineTemplate({ name: "support-ticket-created", subject: "KariGO support ticket created", heading: "Support ticket created", actionLabel: "View ticket" }),
  "support-ticket-updated": defineTemplate({ name: "support-ticket-updated", subject: "KariGO support ticket updated", heading: "Support ticket updated", actionLabel: "View ticket" }),
  "vendor-onboarding-received": defineTemplate({ name: "vendor-onboarding-received", subject: "KariGO vendor onboarding received", heading: "Vendor onboarding received" }),
  "vendor-account-approved": defineTemplate({ name: "vendor-account-approved", subject: "Your KariGO vendor account is approved", heading: "Vendor account approved" }),
  "vendor-new-order": defineTemplate({ name: "vendor-new-order", subject: "New KariGO order received", heading: "New paid order received", actionLabel: "View order" }),
  "settlement-paid": defineTemplate({ name: "settlement-paid", subject: "KariGO settlement marked paid", heading: "Settlement marked paid" }),
  "rider-onboarding-received": defineTemplate({ name: "rider-onboarding-received", subject: "KariGO rider onboarding received", heading: "Rider onboarding received" }),
  "rider-account-approved": defineTemplate({ name: "rider-account-approved", subject: "Your KariGO rider account is approved", heading: "Rider account approved" }),
  "rider-earning-paid": defineTemplate({ name: "rider-earning-paid", subject: "KariGO rider earning marked paid", heading: "Rider earning marked paid" }),
  "admin-critical-alert": defineTemplate({ name: "admin-critical-alert", subject: "Critical KariGO operations alert", heading: "Critical operations alert", actionLabel: "Open admin portal" }),
  "admin-payment-refund-alert": defineTemplate({ name: "admin-payment-refund-alert", subject: "KariGO payment or refund alert", heading: "Payment or refund alert", actionLabel: "Review payment" }),
  "admin-daily-operations-summary": defineTemplate({ name: "admin-daily-operations-summary", subject: "KariGO daily operations summary", heading: "Daily operations summary" })
} as const;

export type EmailTemplateName = keyof typeof emailTemplates;
