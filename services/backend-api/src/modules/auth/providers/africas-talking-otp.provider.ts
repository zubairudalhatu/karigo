import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OtpDeliveryInput, OtpDeliveryResult, OtpProvider, SmsDeliveryInput } from "./otp-provider.interface";

@Injectable()
export class AfricasTalkingOtpProvider implements OtpProvider {
  readonly name = "africas_talking" as const;

  constructor(private readonly config: ConfigService) {}

  async sendOtp(_input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    throw new ServiceUnavailableException("Africa's Talking OTP integration is not configured yet");
  }

  async sendMessage(_input: SmsDeliveryInput): Promise<OtpDeliveryResult> {
    throw new ServiceUnavailableException("Africa's Talking SMS integration is not configured yet");
  }

  async verifyProviderHealth(): Promise<boolean> {
    return Boolean(
      this.config.get<string>("AFRICAS_TALKING_USERNAME") &&
      this.config.get<string>("AFRICAS_TALKING_API_KEY")
    );
  }
}
