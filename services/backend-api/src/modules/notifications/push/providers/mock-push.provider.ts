import { Injectable, Logger } from "@nestjs/common";
import { PushMessage, PushProvider } from "./push-provider.interface";

@Injectable()
export class MockPushProvider implements PushProvider {
  readonly name = "mock" as const;
  private readonly logger = new Logger(MockPushProvider.name);

  async sendPushNotification(message: PushMessage) {
    this.logger.log(`mock push token=${this.mask(message.toDeviceToken)} title=${message.title}`);
    return { accepted: true, provider: this.name };
  }

  async sendBulkPushNotifications(messages: PushMessage[]) {
    this.logger.log(`mock bulk push recipients=${messages.length}`);
    return { accepted: messages.length, provider: this.name };
  }

  validateDeviceToken(token: string) {
    return token.trim().length >= 10;
  }

  async verifyProviderHealth() {
    return { healthy: true, provider: this.name };
  }

  private mask(token: string) {
    const trimmed = token.trim();
    return trimmed.length <= 8 ? "********" : `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }
}
