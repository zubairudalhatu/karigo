import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.IN_APP;
  private readonly logger = new Logger(MockNotificationProvider.name);

  async send(request: ExternalNotificationRequest) {
    this.logger.log(`mock ${request.channel} notification user=${request.userId} type=${request.type}`);
    return { accepted: true, provider: "mock" };
  }
}
