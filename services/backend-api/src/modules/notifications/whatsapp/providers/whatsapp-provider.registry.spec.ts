import { ConfigService } from "@nestjs/config";
import { MetaWhatsAppCloudProvider } from "./meta-whatsapp-cloud.provider";
import { MockWhatsAppProvider } from "./mock-whatsapp.provider";
import { WhatsAppProviderRegistry } from "./whatsapp-provider.registry";

describe("WhatsAppProviderRegistry", () => {
  it("selects mock by default", () => {
    const registry = new WhatsAppProviderRegistry(
      { get: jest.fn((_key, fallback) => fallback) } as unknown as ConfigService,
      { name: "mock" } as MockWhatsAppProvider,
      { name: "meta_cloud" } as MetaWhatsAppCloudProvider
    );
    expect(registry.active().name).toBe("mock");
  });
});
