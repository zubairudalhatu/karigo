export const OTP_PROVIDERS = ["mock", "termii", "africas_talking"] as const;
export type OtpProviderName = (typeof OTP_PROVIDERS)[number];

export interface OtpDeliveryInput {
  phoneNumber: string;
  otpCode: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SmsDeliveryInput {
  phoneNumber: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface OtpDeliveryResult {
  provider: OtpProviderName;
  accepted: boolean;
  providerReference?: string;
  providerResponse?: Record<string, unknown>;
}

export interface OtpProvider {
  readonly name: OtpProviderName;
  sendOtp(input: OtpDeliveryInput): Promise<OtpDeliveryResult>;
  sendMessage(input: SmsDeliveryInput): Promise<OtpDeliveryResult>;
  verifyProviderHealth?(): Promise<boolean>;
}
