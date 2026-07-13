import { BadRequestException } from "@nestjs/common";
import { defineTemplate } from "./template.factory";
import { EmailTemplate, EmailTemplateVariables } from "./template.types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/[^\s"'<>]+$/i.test(value);
}

function defineAccountActivatedTemplate(): EmailTemplate {
  return {
    name: "account-activated",
    requiredVariables: ["recipientName", "message"],
    subject: "Your KariGO account is active",
    heading: "Your account is active",
    render(variables: EmailTemplateVariables) {
      const missing = ["recipientName", "message"].filter((key) => variables[key] === undefined || variables[key] === null || variables[key] === "");
      if (missing.length) throw new BadRequestException(`Missing email template variables: ${missing.join(", ")}`);

      const recipientName = escapeHtml(variables.recipientName);
      const message = escapeHtml(variables.message);
      const supportContact = escapeHtml(variables.supportContact ?? "KariGO Support");
      const logoUrl = isHttpsUrl(variables.logoUrl) ? escapeHtml(variables.logoUrl) : "";
      const pilotLabel = escapeHtml(variables.pilotLabel ?? "Kano controlled early access");
      const logoMarkup = logoUrl
        ? `<img src="${logoUrl}" width="142" alt="KariGO" style="display:block;width:142px;max-width:142px;height:auto;border:0;outline:none;text-decoration:none" />`
        : `<div style="font-size:30px;line-height:1;font-weight:800;letter-spacing:-0.5px;color:#E31E24">KariGO</div>`;
      const htmlBody = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>Your KariGO account is active</title></head><body style="margin:0;padding:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;color:#242424"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your KariGO account is active for controlled early access.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F5F7;margin:0;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E6E8EC;box-shadow:0 12px 34px rgba(36,36,36,0.08)"><tr><td style="background:#242424;padding:24px 26px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="left">${logoMarkup}</td><td align="right" style="font-size:12px;color:#ffffff"><span style="display:inline-block;background:#E31E24;color:#ffffff;border-radius:999px;padding:8px 12px;font-weight:700">${pilotLabel}</span></td></tr></table></td></tr><tr><td style="padding:32px 28px 18px"><p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#5B5F68">Hello ${recipientName},</p><h1 style="margin:0 0 14px;font-size:28px;line-height:1.18;color:#171717;letter-spacing:-0.4px">Your KariGO account is active</h1><p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#373A40">${message}</p><div style="background:#FFF5F5;border:1px solid #FFD6D8;border-radius:14px;padding:16px 18px;margin:22px 0"><p style="margin:0;font-size:14px;line-height:1.65;color:#242424"><strong style="color:#E31E24">Pilot note:</strong> KariGO is currently running controlled early access in Kano. Mock payment remains the selected pilot payment mode unless KariGO separately announces a change.</p></div><p style="margin:20px 0 0;font-size:14px;line-height:1.65;color:#5B5F68">If you did not create this account, please contact ${supportContact} so the KariGO team can review it.</p></td></tr><tr><td style="padding:0 28px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FB;border-radius:14px"><tr><td style="padding:16px 18px;font-size:13px;line-height:1.6;color:#5B5F68">KariGO Express Limited<br />Food, groceries, parcels and approved SME Services across Kano pilot zones.</td></tr></table></td></tr><tr><td style="background:#171717;padding:18px 28px;color:#ffffff;font-size:12px;line-height:1.6">Support: ${supportContact}<br />This is an account activation notification, not a marketing email.</td></tr></table></td></tr></table></body></html>`;
      const textBody = `KariGO\n\nHello ${String(variables.recipientName)},\n\nYour KariGO account is active.\n\n${String(variables.message)}\n\nPilot note: KariGO is currently running controlled early access in Kano. Mock payment remains the selected pilot payment mode unless KariGO separately announces a change.\n\nIf you did not create this account, please contact ${String(variables.supportContact ?? "KariGO Support")}.\n\nKariGO Express Limited\nSupport: ${String(variables.supportContact ?? "KariGO Support")}\nThis is an account activation notification, not a marketing email.`;
      return { subject: "Your KariGO account is active", htmlBody, textBody };
    }
  };
}

export const emailTemplates = {
  "welcome-customer": defineTemplate({ name: "welcome-customer", subject: "Welcome to KariGO", heading: "Welcome to KariGO" }),
  "account-activated": defineAccountActivatedTemplate(),
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
