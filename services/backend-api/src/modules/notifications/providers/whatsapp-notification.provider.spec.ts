import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { WhatsAppNotificationProvider } from "./whatsapp-notification.provider";

describe("WhatsAppNotificationProvider", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const whatsapp = { sendTemplateMessage: jest.fn().mockResolvedValue({ accepted: true, provider: "mock" }) };
  const provider = new WhatsAppNotificationProvider(
    prisma as unknown as PrismaService,
    whatsapp as unknown as WhatsAppService
  );

  beforeEach(() => jest.clearAllMocks());

  it("routes explicit WhatsApp notifications through the mock template provider", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Amina", phoneNumber: "+2348012345678", role: "CUSTOMER" });
    await provider.send({
      userId: "user-1",
      title: "Order update",
      message: "Your order is on the way.",
      type: NotificationType.RIDER_ON_THE_WAY,
      channel: NotificationChannel.WHATSAPP,
      metadata: { orderReference: "KGO-100" }
    });
    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith(expect.objectContaining({
      templateName: "karigo_order_on_the_way",
      variables: expect.objectContaining({ order_reference: "KGO-100" })
    }));
  });

  it("uses the rider job template for an assigned rider", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Rider", phoneNumber: "+2348012345678", role: "RIDER" });
    await provider.send({
      userId: "rider-1",
      title: "New job",
      message: "A job was assigned.",
      type: NotificationType.RIDER_ASSIGNED,
      channel: NotificationChannel.WHATSAPP,
      metadata: { orderReference: "KGO-100" }
    });
    expect(whatsapp.sendTemplateMessage).toHaveBeenCalledWith(expect.objectContaining({
      templateName: "karigo_rider_new_job"
    }));
  });

  it("does not send notification types outside the operational allowlist", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Amina", phoneNumber: "+2348012345678", role: "CUSTOMER" });
    await expect(provider.send({
      userId: "user-1",
      title: "Offer",
      message: "Marketing content",
      type: NotificationType.PROMO_AVAILABLE,
      channel: NotificationChannel.WHATSAPP
    })).resolves.toEqual({ accepted: false, provider: "mock-unsupported-template" });
    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it("does not attempt delivery when the user has no phone number", async () => {
    prisma.user.findUnique.mockResolvedValue({ fullName: "Amina", phoneNumber: null, role: "CUSTOMER" });
    await expect(provider.send({
      userId: "user-1",
      title: "Order update",
      message: "Ready.",
      type: NotificationType.ORDER_READY_FOR_PICKUP,
      channel: NotificationChannel.WHATSAPP
    })).resolves.toEqual({ accepted: false, provider: "mock-no-recipient" });
    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });
});
