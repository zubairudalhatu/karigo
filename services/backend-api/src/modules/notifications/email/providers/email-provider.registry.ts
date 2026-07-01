import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_PROVIDERS, EmailProvider, EmailProviderName } from "./email-provider.interface";
import { MockEmailProvider } from "./mock-email.provider";
import { MailgunEmailProvider, SendGridEmailProvider, SesEmailProvider, SmtpEmailProvider } from "./placeholder-email.providers";

@Injectable()
export class EmailProviderRegistry {
  private readonly providers: Map<EmailProviderName, EmailProvider>;

  constructor(
    private readonly config: ConfigService,
    mock: MockEmailProvider,
    smtp: SmtpEmailProvider,
    sendgrid: SendGridEmailProvider,
    mailgun: MailgunEmailProvider,
    ses: SesEmailProvider
  ) {
    this.providers = new Map([mock, smtp, sendgrid, mailgun, ses].map((provider) => [provider.name, provider]));
  }

  active(): EmailProvider {
    return this.get(this.config.get<string>("EMAIL_PROVIDER", "mock"));
  }

  get(name: string): EmailProvider {
    if (!EMAIL_PROVIDERS.includes(name as EmailProviderName)) {
      throw new BadRequestException("Unsupported email provider");
    }
    return this.providers.get(name as EmailProviderName)!;
  }
}
