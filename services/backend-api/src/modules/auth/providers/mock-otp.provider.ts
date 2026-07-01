import { Injectable } from "@nestjs/common";
import {
  OtpDeliveryInput,
  OtpDeliveryResult,
  OtpProvider,
  SmsDeliveryInput
} from "./otp-provider.interface";

@Injectable()
export class MockOtpProvider implements OtpProvider {
  readonly name = "mock" as const;

  async sendOtp(_input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    return { provider: this.name, accepted: true, providerResponse: { mode: "mock" } };
  }

  async sendMessage(_input: SmsDeliveryInput): Promise<OtpDeliveryResult> {
    return { provider: this.name, accepted: true, providerResponse: { mode: "mock" } };
  }

  async verifyProviderHealth(): Promise<boolean> {
    return true;
  }
}
