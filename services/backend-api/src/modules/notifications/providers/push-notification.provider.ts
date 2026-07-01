import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { PushService } from "../push/push.service";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

@Injectable()
export class PushNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.PUSH;

  constructor(private readonly prisma: PrismaService, private readonly push: PushService) {}

  async send(request: ExternalNotificationRequest) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: request.userId, isActive: true },
      select: { token: true }
    });
    if (!tokens.length) return { accepted: false, provider: "mock-no-recipient" };

    const result = await this.push.sendBulkPushNotifications(tokens.map(({ token }) => ({
      toDeviceToken: token,
      title: request.title,
      body: request.message,
      data: { type: request.type, entityType: request.entityType, entityId: request.entityId },
      metadata: request.metadata
    })));
    return { accepted: result.accepted > 0, provider: result.provider };
  }
}
