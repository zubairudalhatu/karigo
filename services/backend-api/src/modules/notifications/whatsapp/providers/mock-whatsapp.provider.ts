import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  WhatsAppProvider,
  WhatsAppTemplateMessageInput,
  WhatsAppTextMessageInput
} from "./whatsapp-provider.interface";

@Injectable()
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock" as const;
  private readonly logger = new Logger(MockWhatsAppProvider.name);

  async sendTemplateMessage(input: WhatsAppTemplateMessageInput) {
    this.logger.log(`mock WhatsApp template accepted recipient=${this.mask(input.to)} template=${input.templateName}`);
    return { accepted: true, provider: this.name };
  }

  async sendTextMessage(_input: WhatsAppTextMessageInput): Promise<never> {
    throw new BadRequestException("Unrestricted WhatsApp text messages are disabled");
  }

  async verifyWebhookToken(_token: string): Promise<boolean> {
    return false;
  }

  async handleWebhookEvent(_payload: Record<string, unknown>): Promise<{ accepted: boolean }> {
    return { accepted: true };
  }

  async verifyProviderHealth(): Promise<boolean> {
    return true;
  }

  private mask(phone: string): string {
    return phone.length > 4 ? `${"*".repeat(Math.max(phone.length - 4, 4))}${phone.slice(-4)}` : "****";
  }
}
