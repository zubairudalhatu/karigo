import { InternalRideQaPolicy } from "../../taxi/internal-ride-qa.policy";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { PushService } from "../push/push.service";
import { ExternalNotificationRequest, NotificationProvider } from "./notification-provider.interface";

@Injectable()
export class PushNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.PUSH;

  constructor(private readonly prisma: PrismaService, private readonly push: PushService, private readonly internalQa?: InternalRideQaPolicy) {}

  async send(request: ExternalNotificationRequest) {
    const qa = request.entityType === "TaxiTrip" && request.entityId ? await this.internalQa?.lookup(request.entityId) : null;
    if (qa && (request.userId !== qa.captainUserId || request.type !== "RIDER_ASSIGNED")) throw new ForbiddenException("Internal QA recipient isolated.");
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: request.userId, isActive: true, user: { deletedAt: null, accountStatus: "ACTIVE" }, ...(qa ? { platform: "IOS" as const, provider: "EXPO" as const, appSurface: "RIDER_APP" as const } : {}) },
      select: { token: true }
    });
    if (qa && tokens.length !== 1) throw new ForbiddenException("Exactly one QA iPhone registration is required.");
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
