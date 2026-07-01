import { Injectable, Logger } from "@nestjs/common";
import { EmailProvider, SendEmailInput } from "./email-provider.interface";

@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock" as const;
  private readonly logger = new Logger(MockEmailProvider.name);

  async sendEmail(input: SendEmailInput) {
    this.logger.log(`mock email accepted recipient=${this.mask(input.to)} subject="${input.subject}"`);
    return { accepted: true, provider: this.name };
  }

  async verifyProviderHealth(): Promise<boolean> {
    return true;
  }

  private mask(email: string): string {
    const [name, domain] = email.split("@");
    return `${name?.slice(0, 2) ?? "**"}***@${domain ?? "***"}`;
  }
}
