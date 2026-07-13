import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface ApplicationNotificationInput {
  reference: string;
  recipientName: string;
  phoneNumber: string;
  email?: string | null;
}

interface ApplicationReviewNotificationInput extends ApplicationNotificationInput {
  status: string;
  note?: string | null;
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

type ApplicationNotificationType =
  | "vendor_application_received"
  | "delivery_captain_application_received"
  | "delivery_captain_guarantor_listed"
  | "vendor_application_reviewed"
  | "delivery_captain_application_reviewed";

@Injectable()
export class ApplicationNotificationsService {
  private readonly logger = new Logger(ApplicationNotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  async vendorApplicationSubmitted(input: ApplicationNotificationInput): Promise<void> {
    const message = `KariGO has received your vendor application ${input.reference} for Kano pilot review. Approval is not automatic. We will contact you with next steps.`;
    await this.sendApplicantNotification("vendor_application_received", input, {
      subject: "KariGO vendor application received",
      heading: "Your vendor application has been received",
      message
    });
  }

  async deliveryCaptainApplicationSubmitted(input: ApplicationNotificationInput): Promise<void> {
    const message = `KariGO has received your Delivery Captain application ${input.reference} for Kano pilot review. This does not activate dispatch or payouts. We will contact you with next steps.`;
    await this.sendApplicantNotification("delivery_captain_application_received", input, {
      subject: "KariGO Delivery Captain application received",
      heading: "Your Delivery Captain application has been received",
      message
    });
  }

  async vendorApplicationReviewed(input: ApplicationReviewNotificationInput): Promise<void> {
    const statusText = this.statusText(input.status);
    const noteText = input.note ? ` Note from KariGO: ${input.note}` : "";
    const message = `KariGO vendor application ${input.reference} has been updated to ${statusText}.${noteText} Approval does not automatically activate live payments, payouts or public marketplace visibility.`;
    await this.sendApplicantNotification("vendor_application_reviewed", input, {
      subject: "KariGO vendor application update",
      heading: "Your vendor application has been updated",
      message
    });
  }

  async deliveryCaptainApplicationReviewed(input: ApplicationReviewNotificationInput): Promise<void> {
    const statusText = this.statusText(input.status);
    const noteText = input.note ? ` Note from KariGO: ${input.note}` : "";
    const message = `KariGO Delivery Captain application ${input.reference} has been updated to ${statusText}.${noteText} This does not activate dispatch, Ride access or payouts.`;
    await this.sendApplicantNotification("delivery_captain_application_reviewed", input, {
      subject: "KariGO Delivery Captain application update",
      heading: "Your Delivery Captain application has been updated",
      message
    });
  }

  async deliveryCaptainGuarantorListed(input: GuarantorNotificationInput): Promise<void> {
    const message = `KariGO notice: ${input.applicantName} listed you as guarantor for Delivery Captain application ${input.reference}. KariGO may contact you for verification. Do not share OTPs or payment details.`;
    const smsEnabled = this.guarantorSmsEnabled();
    const smsProvider = smsEnabled ? this.smsProvider() : "disabled";
    const result = await this.sendApplicationSms(input.guarantorPhone, message, "Delivery Captain guarantor", smsEnabled);
    this.logDecision({
      type: "delivery_captain_guarantor_listed",
      smsEnabled,
      emailEnabled: false,
      hasPhone: Boolean(input.guarantorPhone),
      hasEmail: false,
      smsProvider,
      emailProvider: "disabled",
      results: [result]
    });
  }

  private async sendApplicantNotification(
    type: ApplicationNotificationType,
    input: ApplicationNotificationInput,
    content: { subject: string; heading: string; message: string }
  ): Promise<void> {
    const smsEnabled = this.smsEnabled();
    const emailEnabled = this.emailEnabled();
    const smsProvider = smsEnabled ? this.smsProvider() : "disabled";
    const emailProvider = emailEnabled ? this.emailProvider() : "disabled";
    const [emailResult, smsResult] = await Promise.all([
      this.sendApplicationEmail({
        to: input.email,
        recipientName: input.recipientName,
        subject: content.subject,
        heading: content.heading,
        message: content.message,
        reference: input.reference
      }),
      this.sendApplicationSms(input.phoneNumber, content.message, this.typeLabel(type), smsEnabled)
    ]);
    this.logDecision({
      type,
      smsEnabled,
      emailEnabled,
      hasPhone: Boolean(input.phoneNumber),
      hasEmail: Boolean(input.email),
      smsProvider,
      emailProvider,
      results: [emailResult, smsResult]
    });
  }

  private async sendApplicationEmail(input: {
    to?: string | null;
    recipientName: string;
    subject: string;
    heading: string;
    message: string;
    reference: string;
  }): Promise<ChannelResult> {
    if (!this.emailEnabled()) return { accepted: false, provider: "disabled", reason: "disabled" };
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

  private async sendApplicationSms(phoneNumber: string | null | undefined, message: string, recipientLabel: string, enabled: boolean): Promise<ChannelResult> {
    if (!enabled) return { accepted: false, provider: "disabled", reason: "disabled" };
    if (!phoneNumber) return { accepted: false, provider: "disabled", reason: "missing_recipient" };
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

  private emailEnabled() {
    return this.flag(["APPLICATION_EMAIL_NOTIFICATIONS_ENABLED", "APPLICATION_NOTIFICATION_EMAIL_ENABLED"]);
  }

  private smsEnabled() {
    return this.flag(["APPLICATION_SMS_NOTIFICATIONS_ENABLED", "APPLICATION_NOTIFICATION_SMS_ENABLED"]);
  }

  private guarantorSmsEnabled() {
    const configured = this.firstConfigured(["GUARANTOR_SMS_NOTIFICATIONS_ENABLED"]);
    if (configured !== undefined && configured !== "") return this.flag(["GUARANTOR_SMS_NOTIFICATIONS_ENABLED"]);
    return this.smsEnabled();
  }

  private emailProvider(): "mock" | "resend" {
    const configured = this.stringValue(["APPLICATION_EMAIL_NOTIFICATION_PROVIDER", "APPLICATION_NOTIFICATION_EMAIL_PROVIDER"]);
    const provider = configured ?? (this.emailEnabled() ? "resend" : "mock");
    return provider.toLowerCase() === "resend" ? "resend" : "mock";
  }

  private smsProvider(): "mock" | "termii" {
    const configured = this.stringValue(["APPLICATION_SMS_NOTIFICATION_PROVIDER", "APPLICATION_NOTIFICATION_SMS_PROVIDER"]);
    const provider = configured ?? (this.smsEnabled() || this.guarantorSmsEnabled() ? "termii" : "mock");
    return provider.toLowerCase() === "termii" ? "termii" : "mock";
  }

  private flag(keys: string[]) {
    const value = this.firstConfigured(keys);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
    return false;
  }

  private firstConfigured(keys: string[]) {
    for (const key of keys) {
      const value = this.config.get<unknown>(key);
      if (value !== undefined && value !== "") return value;
    }
    return undefined;
  }

  private stringValue(keys: string[]) {
    const value = this.firstConfigured(keys);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

  private logDecision(input: {
    type: ApplicationNotificationType;
    smsEnabled: boolean;
    emailEnabled: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
    smsProvider: ChannelResult["provider"];
    emailProvider: ChannelResult["provider"];
    results: ChannelResult[];
  }) {
    const result = this.decisionResult(input.results);
    const reason = this.decisionReason(input.results, result);
    this.logger.log(
      `Application notification decision type=${input.type} smsEnabled=${input.smsEnabled} emailEnabled=${input.emailEnabled} hasPhone=${input.hasPhone} hasEmail=${input.hasEmail} smsProvider=${input.smsProvider} emailProvider=${input.emailProvider} result=${result} reason=${reason}`
    );
  }

  private decisionResult(results: ChannelResult[]) {
    if (results.some((result) => result.accepted)) return "sent";
    if (results.some((result) => result.reason === "provider_error")) return "failed";
    return "skipped";
  }

  private decisionReason(results: ChannelResult[], result: string) {
    if (result === "sent") return "provider_accepted";
    const reason = results.find((item) => item.reason)?.reason;
    return reason ?? "not_enabled";
  }

  private typeLabel(type: ApplicationNotificationType) {
    const labels: Record<ApplicationNotificationType, string> = {
      vendor_application_received: "vendor applicant",
      delivery_captain_application_received: "Delivery Captain applicant",
      delivery_captain_guarantor_listed: "Delivery Captain guarantor",
      vendor_application_reviewed: "vendor applicant review",
      delivery_captain_application_reviewed: "Delivery Captain applicant review"
    };
    return labels[type];
  }

  private statusText(status: string) {
    return status.toLowerCase().replaceAll("_", " ");
  }
}
