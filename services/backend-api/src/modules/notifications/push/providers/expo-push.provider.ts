import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PushMessage, PushProvider } from "./push-provider.interface";

@Injectable()
export class ExpoPushProvider implements PushProvider {
  readonly name = "expo" as const;

  sendPushNotification(_message: PushMessage): Promise<{ accepted: boolean; provider: string }> {
    throw new ServiceUnavailableException("Expo push sandbox provider is not enabled");
  }

  sendBulkPushNotifications(_messages: PushMessage[]): Promise<{ accepted: number; provider: string }> {
    throw new ServiceUnavailableException("Expo push sandbox provider is not enabled");
  }
}
