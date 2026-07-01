import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OtpDeliveryInput,
  OtpDeliveryResult,
  OtpProvider,
  SmsDeliveryInput
} from "./otp-provider.interface";

@Injectable()
export class TermiiOtpProvider implements OtpProvider {
  readonly name = "termii" as const;
  private readonly logger = new Logger(TermiiOtpProvider.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    const expiryMinutes = Math.max(1, Math.ceil((input.expiresAt.getTime() - Date.now()) / 60_000));
    return this.sendMessage({
      phoneNumber: input.phoneNumber,
      message: `Your KariGO verification code is ${input.otpCode}. It expires in ${expiryMinutes} minutes.`,
      metadata: input.metadata
    });
  }

  async sendMessage(input: SmsDeliveryInput): Promise<OtpDeliveryResult> {
    const apiKey = this.config.get<string>("TERMII_API_KEY");
    const senderId = this.config.get<string>("TERMII_SENDER_ID", "KariGO");
    if (!apiKey) {
      throw new ServiceUnavailableException("SMS verification is temporarily unavailable");
    }

    try {
      const response = await fetch(`${this.baseUrl()}/api/sms/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          to: input.phoneNumber,
          from: senderId,
          sms: input.message,
          type: "plain",
          channel: "generic"
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(`Termii returned HTTP ${response.status}`);

      return {
        provider: this.name,
        accepted: true,
        providerReference: typeof payload.message_id === "string" ? payload.message_id : undefined,
        providerResponse: payload
      };
    } catch {
      this.logger.warn("Termii SMS request failed");
      throw new ServiceUnavailableException("SMS verification is temporarily unavailable");
    }
  }

  async verifyProviderHealth(): Promise<boolean> {
    return Boolean(this.config.get<string>("TERMII_API_KEY"));
  }

  private baseUrl(): string {
    return this.config.get<string>("TERMII_BASE_URL", "https://api.ng.termii.com").replace(/\/+$/, "");
  }
}
