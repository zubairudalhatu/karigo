import { ConfigService } from "@nestjs/config";
import { ExpoPushProvider } from "./expo-push.provider";
import { FirebasePushProvider } from "./firebase-push.provider";
import { MockPushProvider } from "./mock-push.provider";
import { PushProviderRegistry } from "./push-provider.registry";

describe("PushProviderRegistry", () => {
  it("selects mock by default", () => {
    const mock = new MockPushProvider();
    const registry = new PushProviderRegistry(
      new ConfigService({}) as ConfigService,
      mock,
      new ExpoPushProvider(),
      new FirebasePushProvider()
    );

    expect(registry.active()).toBe(mock);
  });
});
