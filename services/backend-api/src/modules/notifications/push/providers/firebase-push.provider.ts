import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PushMessage, PushProvider } from "./push-provider.interface";

@Injectable()
export class FirebasePushProvider implements PushProvider {
  readonly name = "firebase" as const;

  sendPushNotification(_message: PushMessage): Promise<{ accepted: boolean; provider: string }> {
    throw new ServiceUnavailableException("Firebase push sandbox provider is not enabled");
  }

  sendBulkPushNotifications(_messages: PushMessage[]): Promise<{ accepted: number; provider: string }> {
    throw new ServiceUnavailableException("Firebase push sandbox provider is not enabled");
  }
}
