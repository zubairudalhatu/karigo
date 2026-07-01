export type PushProviderName = "mock" | "expo" | "firebase";

export interface PushMessage {
  toDeviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PushProvider {
  readonly name: PushProviderName;
  sendPushNotification(message: PushMessage): Promise<{ accepted: boolean; provider: string }>;
  sendBulkPushNotifications(messages: PushMessage[]): Promise<{ accepted: number; provider: string }>;
  validateDeviceToken?(token: string): boolean;
  verifyProviderHealth?(): Promise<{ healthy: boolean; provider: string }>;
}
