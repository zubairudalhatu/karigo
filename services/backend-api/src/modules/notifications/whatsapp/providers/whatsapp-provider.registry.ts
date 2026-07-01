import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetaWhatsAppCloudProvider } from "./meta-whatsapp-cloud.provider";
import { MockWhatsAppProvider } from "./mock-whatsapp.provider";
import { WHATSAPP_PROVIDERS, WhatsAppProvider, WhatsAppProviderName } from "./whatsapp-provider.interface";

@Injectable()
export class WhatsAppProviderRegistry {
  private readonly providers: Map<WhatsAppProviderName, WhatsAppProvider>;

  constructor(
    private readonly config: ConfigService,
    mock: MockWhatsAppProvider,
    metaCloud: MetaWhatsAppCloudProvider
  ) {
    this.providers = new Map([mock, metaCloud].map((provider) => [provider.name, provider]));
  }

  active(): WhatsAppProvider {
    return this.get(this.config.get<string>("WHATSAPP_PROVIDER", "mock"));
  }

  get(name: string): WhatsAppProvider {
    if (!WHATSAPP_PROVIDERS.includes(name as WhatsAppProviderName)) {
      throw new BadRequestException("Unsupported WhatsApp provider");
    }
    return this.providers.get(name as WhatsAppProviderName)!;
  }
}
