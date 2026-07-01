import { BadRequestException } from "@nestjs/common";
import { EmailTemplate, EmailTemplateVariables } from "./template.types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function interpolate(value: string, variables: EmailTemplateVariables): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => escapeHtml(variables[key]));
}

export function defineTemplate(input: {
  name: string;
  subject: string;
  heading: string;
  requiredVariables?: string[];
  actionLabel?: string;
}): EmailTemplate {
  const requiredVariables = input.requiredVariables ?? ["recipientName", "message"];
  return {
    ...input,
    requiredVariables,
    render(variables) {
      const missing = requiredVariables.filter((key) => variables[key] === undefined || variables[key] === null || variables[key] === "");
      if (missing.length) throw new BadRequestException(`Missing email template variables: ${missing.join(", ")}`);

      const subject = interpolate(input.subject, variables);
      const heading = interpolate(input.heading, variables);
      const recipientName = escapeHtml(variables.recipientName);
      const message = escapeHtml(variables.message);
      const actionUrl = variables.actionUrl ? escapeHtml(variables.actionUrl) : "";
      const supportContact = escapeHtml(variables.supportContact ?? "KariGO Support");
      const action = input.actionLabel && actionUrl
        ? `<p><a href="${actionUrl}" style="background:#E31E24;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(input.actionLabel)}</a></p>`
        : "";
      const htmlBody = `<!doctype html><html><body style="margin:0;background:#F5F5F5;font-family:Arial,sans-serif;color:#242424"><div style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden"><div style="background:#E31E24;color:#fff;padding:20px;font-size:26px;font-weight:700">KariGO</div><div style="padding:24px"><p>Hello ${recipientName},</p><h1 style="font-size:22px">${heading}</h1><p style="line-height:1.6">${message}</p>${action}<p style="margin-top:28px">Thank you for choosing KariGO.</p></div><div style="padding:16px 24px;background:#242424;color:#fff;font-size:12px">Support: ${supportContact}</div></div></body></html>`;
      const textBody = `KariGO\n\nHello ${String(variables.recipientName)},\n\n${heading}\n\n${String(variables.message)}${input.actionLabel && variables.actionUrl ? `\n\n${input.actionLabel}: ${String(variables.actionUrl)}` : ""}\n\nThank you for choosing KariGO.\nSupport: ${String(variables.supportContact ?? "KariGO Support")}`;
      return { subject, htmlBody, textBody };
    }
  };
}
