import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  WhatsAppProvider,
  WhatsAppTemplateMessageInput,
  WhatsAppTextMessageInput
} from "./whatsapp-provider.interface";

@Injectable()
export class MetaWhatsAppCloudProvider implements WhatsAppProvider {
  readonly name = "meta_cloud" as const;

  async sendTemplateMessage(_input: WhatsAppTemplateMessageInput): Promise<never> {
    throw new ServiceUnavailableException("Meta WhatsApp Cloud integration is not configured yet");
  }

  async sendTextMessage(_input: WhatsAppTextMessageInput): Promise<never> {
    throw new ServiceUnavailableException("Meta WhatsApp Cloud text messaging is not enabled");
  }

  async verifyWebhookToken(_token: string): Promise<boolean> {
    return false;
  }

  async handleWebhookEvent(_payload: Record<string, unknown>): Promise<never> {
    throw new ServiceUnavailableException("Meta WhatsApp Cloud webhook handling is not configured yet");
  }

  async verifyProviderHealth(): Promise<boolean> {
    return false;
  }
}
