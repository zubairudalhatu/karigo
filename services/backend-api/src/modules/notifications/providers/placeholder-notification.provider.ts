import { Logger } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

export abstract class PlaceholderNotificationProvider implements NotificationProvider {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly channel: NotificationChannel;
  async send(request: ExternalNotificationRequest) {
    // TODO(provider-go-live): Replace with the selected channel adapter and require its credentials at startup.
    this.logger.log(`placeholder ${this.channel} notification routed through mock user=${request.userId}`);
    return { accepted: true, provider: `mock-${this.channel.toLowerCase()}` };
  }
}
