import { NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const prisma = {
    notification: {
      create: jest.fn(), findMany: jest.fn(), count: jest.fn(),
      findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn()
    }
  };
  const mock = { send: jest.fn() };
  const service = new NotificationsService(
    prisma as unknown as PrismaService,
    mock as never, mock as never, mock as never, mock as never, mock as never
  );

  beforeEach(() => jest.clearAllMocks());

  it("stores in-app notifications", async () => {
    prisma.notification.create.mockResolvedValue({ id: "notification-1" });
    await service.createNotification({
      userId: "user-1", title: "Order update", message: "Ready",
      type: NotificationType.ORDER_READY_FOR_PICKUP
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", channel: NotificationChannel.IN_APP })
    });
  });

  it("scopes activity-feed reads to the authenticated user", async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await service.listMine("user-1", { page: 1, limit: 20, isRead: false });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", isRead: false },
      orderBy: { createdAt: "desc" }
    }));
  });

  it("does not let a user read another user's notification", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead("user-1", "notification-2")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("routes external channels through mock placeholders without storing in-app records", async () => {
    mock.send.mockResolvedValue({ accepted: true, provider: "mock-sms" });
    await service.createNotification({
      userId: "user-1", title: "Alert", message: "Test",
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.SMS
    });
    expect(mock.send).toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
