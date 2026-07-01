import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { EmailProvider, EmailProviderName, SendEmailInput } from "./email-provider.interface";

abstract class PlaceholderEmailProvider implements EmailProvider {
  abstract readonly name: EmailProviderName;

  async sendEmail(_input: SendEmailInput): Promise<never> {
    throw new ServiceUnavailableException(`${this.name} email integration is not configured yet`);
  }

  async verifyProviderHealth(): Promise<boolean> {
    return false;
  }
}

@Injectable()
export class SmtpEmailProvider extends PlaceholderEmailProvider { readonly name = "smtp" as const; }
@Injectable()
export class SendGridEmailProvider extends PlaceholderEmailProvider { readonly name = "sendgrid" as const; }
@Injectable()
export class MailgunEmailProvider extends PlaceholderEmailProvider { readonly name = "mailgun" as const; }
@Injectable()
export class SesEmailProvider extends PlaceholderEmailProvider { readonly name = "ses" as const; }
