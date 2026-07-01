export const WHATSAPP_PROVIDERS = ["mock", "meta_cloud"] as const;
export type WhatsAppProviderName = (typeof WHATSAPP_PROVIDERS)[number];

export interface WhatsAppTemplateMessageInput {
  to: string;
  templateName: string;
  variables: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppTextMessageInput {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppDeliveryResult {
  accepted: boolean;
  provider: WhatsAppProviderName;
  providerReference?: string;
}

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  sendTemplateMessage(input: WhatsAppTemplateMessageInput): Promise<WhatsAppDeliveryResult>;
  sendTextMessage(input: WhatsAppTextMessageInput): Promise<WhatsAppDeliveryResult>;
  verifyWebhookToken(token: string): Promise<boolean>;
  handleWebhookEvent(payload: Record<string, unknown>): Promise<{ accepted: boolean }>;
  verifyProviderHealth?(): Promise<boolean>;
}
