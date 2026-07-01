export const EMAIL_PROVIDERS = ["mock", "smtp", "sendgrid", "mailgun", "ses"] as const;
export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

export interface SendEmailInput {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  metadata?: Record<string, unknown>;
}

export interface EmailDeliveryResult {
  accepted: boolean;
  provider: EmailProviderName;
  providerReference?: string;
}

export interface EmailProvider {
  readonly name: EmailProviderName;
  sendEmail(input: SendEmailInput): Promise<EmailDeliveryResult>;
  verifyProviderHealth?(): Promise<boolean>;
}
