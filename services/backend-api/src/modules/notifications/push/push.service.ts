import { Injectable } from "@nestjs/common";
import { PushProviderRegistry } from "./providers/push-provider.registry";
import { PushMessage } from "./providers/push-provider.interface";

@Injectable()
export class PushService {
  constructor(private readonly providers: PushProviderRegistry) {}

  sendPushNotification(message: PushMessage) {
    return this.providers.active().sendPushNotification(message);
  }

  sendBulkPushNotifications(messages: PushMessage[]) {
    return this.providers.active().sendBulkPushNotifications(messages);
  }
}
