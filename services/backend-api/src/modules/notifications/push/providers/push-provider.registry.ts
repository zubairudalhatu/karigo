import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ExpoPushProvider } from "./expo-push.provider";
import { FirebasePushProvider } from "./firebase-push.provider";
import { MockPushProvider } from "./mock-push.provider";
import { PushProvider, PushProviderName } from "./push-provider.interface";

@Injectable()
export class PushProviderRegistry {
  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockPushProvider,
    private readonly expo: ExpoPushProvider,
    private readonly firebase: FirebasePushProvider
  ) {}

  active(): PushProvider {
    const name = this.config.get<string>("PUSH_PROVIDER", "mock").toLowerCase() as PushProviderName;
    return { mock: this.mock, expo: this.expo, firebase: this.firebase }[name] ?? this.mock;
  }
}
