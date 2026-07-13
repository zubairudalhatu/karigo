import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { emailTemplates } from "../notifications/email/templates/template.catalogue";
import { RenderedEmailTemplate } from "../notifications/email/templates/template.types";

type AccountActivationEmailProvider = "mock" | "resend";

interface AccountActivationEmailInput {
  userId: string;
  fullName: string;
  email?: string | null;
}

interface AccountActivationEmailResult {
  accepted: boolean;
  provider: AccountActivationEmailProvider | "disabled";
  providerReference?: string;
  reason?: "disabled" | "missing_email";
}

@Injectable()
export class AccountActivationEmailService {
  private readonly logger = new Logger(AccountActivationEmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendAccountActivatedEmail(input: AccountActivationEmailInput): Promise<AccountActivationEmailResult> {
    if (!this.isEnabled()) {
      return { accepted: false, provider: "disabled", reason: "disabled" };
    }

    if (!input.email) {
      return { accepted: false, provider: "disabled", reason: "missing_email" };
    }

    const rendered = emailTemplates["account-activated"].render({
      recipientName: input.fullName,
      message: "Your KariGO account is now active. You can sign in and use approved pilot features.",
      supportContact: this.config.get<string>("EMAIL_REPLY_TO", "KariGO Support")
    });
    const provider = this.provider();

    if (provider === "mock") {
      this.logger.log(`mock account activation email accepted recipient=${this.maskEmail(input.email)}`);
      return { accepted: true, provider };
    }

    return this.sendWithResend(input.email, rendered);
  }

  private isEnabled(): boolean {
    return this.config.get<boolean>("ACCOUNT_ACTIVATION_EMAIL_ENABLED", false);
  }

  private provider(): AccountActivationEmailProvider {
    const configured = this.config.get<string>("ACCOUNT_ACTIVATION_EMAIL_PROVIDER", "mock").toLowerCase();
    return configured === "resend" ? "resend" : "mock";
  }

  private async sendWithResend(to: string, rendered: RenderedEmailTemplate): Promise<AccountActivationEmailResult> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM");
    const replyTo = this.config.get<string>("RESEND_REPLY_TO") ?? this.config.get<string>("EMAIL_REPLY_TO");
    if (!apiKey || !from) {
      throw new ServiceUnavailableException("Account activation email is temporarily unavailable");
    }

    try {
      const response = await fetch(`${this.baseUrl()}/emails`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: replyTo,
          subject: rendered.subject,
          html: rendered.htmlBody,
          text: rendered.textBody
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(`Resend returned HTTP ${response.status}`);
      }

      return {
        accepted: true,
        provider: "resend",
        providerReference: typeof payload.id === "string" ? payload.id : undefined
      };
    } catch {
      this.logger.warn(`Resend account activation email request failed recipient=${this.maskEmail(to)}`);
      throw new ServiceUnavailableException("Account activation email is temporarily unavailable");
    }
  }

  private baseUrl(): string {
    return this.config.get<string>("RESEND_BASE_URL", "https://api.resend.com").replace(/\/+$/, "");
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split("@");
    return `${name?.slice(0, 2) ?? "**"}***@${domain ?? "***"}`;
  }
}
