import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AfricasTalkingOtpProvider } from "./africas-talking-otp.provider";
import { MockOtpProvider } from "./mock-otp.provider";
import { OTP_PROVIDERS, OtpProvider, OtpProviderName } from "./otp-provider.interface";
import { TermiiOtpProvider } from "./termii-otp.provider";

@Injectable()
export class OtpProviderRegistry {
  private readonly providers: Map<OtpProviderName, OtpProvider>;

  constructor(
    private readonly config: ConfigService,
    mock: MockOtpProvider,
    termii: TermiiOtpProvider,
    africasTalking: AfricasTalkingOtpProvider
  ) {
    this.providers = new Map(
      [mock, termii, africasTalking].map((provider) => [provider.name, provider])
    );
  }

  active(): OtpProvider {
    return this.get(this.config.get<string>("OTP_PROVIDER", "mock"));
  }

  get(name: string): OtpProvider {
    if (!OTP_PROVIDERS.includes(name as OtpProviderName)) {
      throw new BadRequestException("Unsupported OTP provider");
    }
    return this.providers.get(name as OtpProviderName)!;
  }
}
