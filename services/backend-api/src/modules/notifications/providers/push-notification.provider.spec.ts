import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { PushService } from "../push/push.service";
import { PushNotificationProvider } from "./push-notification.provider";

describe("PushNotificationProvider", () => {
  const prisma = { deviceToken: { findMany: jest.fn() } };
  const push = { sendBulkPushNotifications: jest.fn() };
  const provider = new PushNotificationProvider(
    prisma as unknown as PrismaService,
    push as unknown as PushService
  );

  beforeEach(() => jest.clearAllMocks());

  it("sends only to the user's active tokens through the mock push service", async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: "ExponentPushToken[test]" }]);
    push.sendBulkPushNotifications.mockResolvedValue({ accepted: 1, provider: "mock" });

    await expect(provider.send({
      userId: "user-1",
      title: "Order update",
      message: "Your order is on the way.",
      type: NotificationType.RIDER_ON_THE_WAY,
      channel: NotificationChannel.PUSH,
      entityType: "ORDER",
      entityId: "order-1"
    })).resolves.toEqual({ accepted: true, provider: "mock" });
    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isActive: true },
      select: { token: true }
    });
  });

  it("fails safely when the user has no active token", async () => {
    prisma.deviceToken.findMany.mockResolvedValue([]);
    await expect(provider.send({
      userId: "user-1",
      title: "Update",
      message: "Update",
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.PUSH
    })).resolves.toEqual({ accepted: false, provider: "mock-no-recipient" });
  });
});
