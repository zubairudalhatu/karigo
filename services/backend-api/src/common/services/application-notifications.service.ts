import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface ApplicationNotificationInput {
  reference: string;
  recipientName: string;
  phoneNumber: string;
  email?: string | null;
}

interface GuarantorNotificationInput {
  reference: string;
  applicantName: string;
  guarantorName: string;
  guarantorPhone: string;
}

interface ChannelResult {
  accepted: boolean;
  provider: "disabled" | "mock" | "resend" | "termii";
  reason?: "disabled" | "missing_recipient" | "provider_error";
  providerReference?: string;
}

@Injectable()
export class ApplicationNotificationsService {
  private readonly logger = new Logger(ApplicationNotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  async vendorApplicationSubmitted(input: ApplicationNotificationInput): Promise<void> {
    const message = `KariGO has received your vendor application ${input.reference} for Kano pilot review. Approval is not automatic. We will contact you with next steps.`;
    await Promise.all([
      this.sendApplicationEmail({
        to: input.email,
        recipientName: input.recipientName,
        subject: "KariGO vendor application received",
        heading: "Your vendor application has been received",
        message,
        reference: input.reference
      }),
      this.sendApplicationSms(input.phoneNumber, message, "vendor applicant")
    ]);
  }

  async deliveryCaptainApplicationSubmitted(input: ApplicationNotificationInput): Promise<void> {
    const message = `KariGO has received your Delivery Captain application ${input.reference} for Kano pilot review. This does not activate dispatch or payouts. We will contact you with next steps.`;
    await Promise.all([
      this.sendApplicationEmail({
        to: input.email,
        recipientName: input.recipientName,
        subject: "KariGO Delivery Captain application received",
        heading: "Your Delivery Captain application has been received",
        message,
        reference: input.reference
      }),
      this.sendApplicationSms(input.phoneNumber, message, "Delivery Captain applicant")
    ]);
  }

  async deliveryCaptainGuarantorListed(input: GuarantorNotificationInput): Promise<void> {
    const message = `KariGO notice: ${input.applicantName} listed you as guarantor for Delivery Captain application ${input.reference}. KariGO may contact you for verification. Do not share OTPs or payment details.`;
    await this.sendApplicationSms(input.guarantorPhone, message, "Delivery Captain guarantor");
  }

  private async sendApplicationEmail(input: {
    to?: string | null;
    recipientName: string;
    subject: string;
    heading: string;
    message: string;
    reference: string;
  }): Promise<ChannelResult> {
    if (!this.enabled() || !this.emailEnabled()) return { accepted: false, provider: "disabled", reason: "disabled" };
    if (!input.to) return { accepted: false, provider: "disabled", reason: "missing_recipient" };
    const to = input.to;
    const provider = this.emailProvider();
    if (provider === "mock") {
      this.logger.log(`mock application email accepted recipient=${this.maskEmail(to)} reference=${input.reference}`);
      return { accepted: true, provider: "mock" };
    }

    try {
      return await this.sendWithResend({ ...input, to });
    } catch {
      this.logger.warn(`application email failed recipient=${this.maskEmail(to)} reference=${input.reference}`);
      return { accepted: false, provider: "resend", reason: "provider_error" };
    }
  }

  private async sendApplicationSms(phoneNumber: string, message: string, recipientLabel: string): Promise<ChannelResult> {
    if (!this.enabled() || !this.smsEnabled()) return { accepted: false, provider: "disabled", reason: "disabled" };
    const provider = this.smsProvider();
    if (provider === "mock") {
      this.logger.log(`mock application SMS accepted recipient=${this.maskPhone(phoneNumber)} label=${recipientLabel}`);
      return { accepted: true, provider: "mock" };
    }

    try {
      return await this.sendWithTermii(phoneNumber, message);
    } catch {
      this.logger.warn(`application SMS failed recipient=${this.maskPhone(phoneNumber)} label=${recipientLabel}`);
      return { accepted: false, provider: "termii", reason: "provider_error" };
    }
  }

  private async sendWithResend(input: {
    to: string;
    recipientName: string;
    subject: string;
    heading: string;
    message: string;
    reference: string;
  }): Promise<ChannelResult> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM");
    const replyTo = this.config.get<string>("RESEND_REPLY_TO") ?? this.config.get<string>("EMAIL_REPLY_TO");
    if (!apiKey || !from) return { accepted: false, provider: "resend", reason: "provider_error" };

    const rendered = this.renderEmail(input);
    const response = await fetch(`${this.resendBaseUrl()}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: replyTo,
        subject: rendered.subject,
        html: rendered.htmlBody,
        text: rendered.textBody
      }),
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
    return {
      accepted: true,
      provider: "resend",
      providerReference: typeof payload.id === "string" ? payload.id : undefined
    };
  }

  private async sendWithTermii(phoneNumber: string, message: string): Promise<ChannelResult> {
    const apiKey = this.config.get<string>("TERMII_API_KEY");
    const senderId = this.config.get<string>("TERMII_SENDER_ID", "KariGO");
    if (!apiKey) return { accepted: false, provider: "termii", reason: "provider_error" };

    const response = await fetch(`${this.termiiBaseUrl()}/api/sms/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: phoneNumber,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic"
      }),
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(`Termii returned HTTP ${response.status}`);
    return {
      accepted: true,
      provider: "termii",
      providerReference: typeof payload.message_id === "string" ? payload.message_id : undefined
    };
  }

  private renderEmail(input: { recipientName: string; subject: string; heading: string; message: string; reference: string }) {
    const recipientName = this.escapeHtml(input.recipientName);
    const heading = this.escapeHtml(input.heading);
    const message = this.escapeHtml(input.message);
    const reference = this.escapeHtml(input.reference);
    const supportContact = this.escapeHtml(this.config.get<string>("EMAIL_REPLY_TO", "KariGO Support"));
    const pilotLabel = this.escapeHtml(this.config.get<string>("KARIGO_PILOT_EMAIL_LABEL", "Kano controlled early access"));
    const logoUrl = this.httpsUrl(this.config.get<string>("KARIGO_EMAIL_LOGO_URL")) ? this.escapeHtml(this.config.get<string>("KARIGO_EMAIL_LOGO_URL")) : "";
    const logoMarkup = logoUrl
      ? `<img src="${logoUrl}" width="142" alt="KariGO" style="display:block;width:142px;max-width:142px;height:auto;border:0;outline:none;text-decoration:none" />`
      : `<div style="font-size:30px;line-height:1;font-weight:800;letter-spacing:-0.5px;color:#E31E24">KariGO</div>`;
    const htmlBody = `<!doctype html><html><body style="margin:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;color:#242424"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F5F7;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E6E8EC"><tr><td style="background:#242424;padding:24px 26px">${logoMarkup}</td></tr><tr><td style="padding:30px 28px"><p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#5B5F68">Hello ${recipientName},</p><h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#171717">${heading}</h1><p style="font-size:16px;line-height:1.7;color:#373A40">${message}</p><p style="background:#FFF5F5;border:1px solid #FFD6D8;border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6"><strong style="color:#E31E24">Reference:</strong> ${reference}<br /><strong style="color:#E31E24">Pilot:</strong> ${pilotLabel}</p><p style="font-size:14px;line-height:1.65;color:#5B5F68">This is an application confirmation message, not a marketing email. KariGO will never ask you to share OTPs, card details or payment secrets by email.</p></td></tr><tr><td style="background:#171717;padding:18px 28px;color:#ffffff;font-size:12px;line-height:1.6">Support: ${supportContact}<br />KariGO Express Limited</td></tr></table></td></tr></table></body></html>`;
    const textBody = `KariGO\n\nHello ${input.recipientName},\n\n${input.heading}\n\n${input.message}\n\nReference: ${input.reference}\nPilot: ${this.config.get<string>("KARIGO_PILOT_EMAIL_LABEL", "Kano controlled early access")}\n\nThis is an application confirmation message, not a marketing email. KariGO will never ask you to share OTPs, card details or payment secrets by email.\n\nSupport: ${this.config.get<string>("EMAIL_REPLY_TO", "KariGO Support")}\nKariGO Express Limited`;
    return { subject: input.subject, htmlBody, textBody };
  }

  private enabled() {
    return this.flag("APPLICATION_NOTIFICATIONS_ENABLED");
  }

  private emailEnabled() {
    return this.flag("APPLICATION_NOTIFICATION_EMAIL_ENABLED");
  }

  private smsEnabled() {
    return this.flag("APPLICATION_NOTIFICATION_SMS_ENABLED");
  }

  private emailProvider(): "mock" | "resend" {
    return this.config.get<string>("APPLICATION_NOTIFICATION_EMAIL_PROVIDER", "mock").toLowerCase() === "resend" ? "resend" : "mock";
  }

  private smsProvider(): "mock" | "termii" {
    return this.config.get<string>("APPLICATION_NOTIFICATION_SMS_PROVIDER", "mock").toLowerCase() === "termii" ? "termii" : "mock";
  }

  private flag(key: string) {
    const value = this.config.get<unknown>(key, false);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
    return false;
  }

  private resendBaseUrl() {
    return this.config.get<string>("RESEND_BASE_URL", "https://api.resend.com").replace(/\/+$/, "");
  }

  private termiiBaseUrl() {
    return this.config.get<string>("TERMII_BASE_URL", "https://api.ng.termii.com").replace(/\/+$/, "");
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  private httpsUrl(value: unknown): value is string {
    return typeof value === "string" && /^https:\/\/[^\s"'<>]+$/i.test(value);
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split("@");
    return `${name?.slice(0, 2) ?? "**"}***@${domain ?? "***"}`;
  }

  private maskPhone(phoneNumber: string): string {
    return phoneNumber.length <= 7 ? "***" : `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-3)}`;
  }
}
