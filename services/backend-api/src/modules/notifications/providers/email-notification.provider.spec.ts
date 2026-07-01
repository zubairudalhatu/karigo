import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { EmailNotificationProvider } from "./email-notification.provider";

describe("EmailNotificationProvider", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const email = { sendTemplateEmail: jest.fn().mockResolvedValue({ accepted: true, provider: "mock" }) };
  const provider = new EmailNotificationProvider(
    prisma as unknown as PrismaService,
    email as unknown as EmailService
  );

  beforeEach(() => jest.clearAllMocks());

  it("sends an event template through mock email when a user has an email address", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Amina", email: "amina@example.com" });
    await provider.send({
      userId: "user-1",
      title: "Payment successful",
      message: "Payment received.",
      type: NotificationType.PAYMENT_SUCCESSFUL,
      channel: NotificationChannel.EMAIL
    });
    expect(email.sendTemplateEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "amina@example.com",
      templateName: "payment-successful"
    }));
  });

  it("does not attempt delivery when the user has no email address", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Amina", email: null });
    await expect(provider.send({
      userId: "user-1",
      title: "Order update",
      message: "Ready.",
      type: NotificationType.ORDER_READY_FOR_PICKUP,
      channel: NotificationChannel.EMAIL
    })).resolves.toEqual({ accepted: false, provider: "mock-no-recipient" });
    expect(email.sendTemplateEmail).not.toHaveBeenCalled();
  });
});
