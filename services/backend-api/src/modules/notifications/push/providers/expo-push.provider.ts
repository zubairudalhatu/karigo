import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PushMessage, PushProvider } from "./push-provider.interface";

type ExpoTicket = { status?: "ok" | "error"; id?: string; message?: string };

@Injectable()
export class ExpoPushProvider implements PushProvider {
  readonly name = "expo" as const;
  private readonly defaultUrl = "https://exp.host/--/api/v2/push/send";

  constructor(private readonly config: ConfigService) {}

  async sendPushNotification(message: PushMessage) {
    const accepted = await this.sendBatch([message]);
    return { accepted: accepted === 1, provider: this.name };
  }

  async sendBulkPushNotifications(messages: PushMessage[]) {
    let accepted = 0;
    for (let index = 0; index < messages.length; index += 100) {
      accepted += await this.sendBatch(messages.slice(index, index + 100));
    }
    return { accepted, provider: this.name };
  }

  validateDeviceToken(token: string) {
    return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token.trim());
  }

  private async sendBatch(messages: PushMessage[]) {
    const eligible = messages.filter((message) => this.validateDeviceToken(message.toDeviceToken));
    if (!eligible.length) return 0;

    const url = this.config.get<string>("EXPO_PUSH_URL", this.defaultUrl).trim();
    const accessToken = this.config.get<string>("EXPO_ACCESS_TOKEN")?.trim();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(eligible.map((message) => ({
        to: message.toDeviceToken,
        title: message.title,
        body: message.body,
        sound: "default",
        priority: "high",
        channelId: "captain-assignments",
        data: {
          ...(message.data ?? {}),
          ...(message.metadata ? { metadata: message.metadata } : {})
        }
      }))),
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await response.json().catch(() => ({})) as { data?: ExpoTicket[] | ExpoTicket };
    if (!response.ok) {
      throw new ServiceUnavailableException(`Expo push returned HTTP ${response.status}`);
    }
    const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
    return tickets.filter((ticket) => ticket.status === "ok").length;
  }
}
