import { PartnerPushService } from "./partner-push.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PushService } from "./push/push.service";

describe("Partner push app isolation and privacy", () => {
  let db: any, push: any, service: PartnerPushService;
  beforeEach(() => {
    db = { notification:{upsert:jest.fn(async()=>({id:"notice"}))}, vendor: { findFirst: jest.fn(async () => ({ id: "vendor", userId: "owner" })) }, partnerPushPreference: {
      upsert: jest.fn(async () => ({ enabled: true, orders: true, settlements: true })), findUnique: jest.fn(async () => ({ enabled: true, orders: true, settlements: true })) },
      deviceToken: { findUnique: jest.fn(), upsert: jest.fn(async () => ({ id: "device" })), findMany: jest.fn(async () => [{ token: "ExpoPushToken[synthetic]" }]), deleteMany: jest.fn() },
      order: { findUnique: jest.fn(async () => ({ id: "order", orderStatus: "CANCELLED", updatedAt: new Date(0), vendor: { userId: "owner" } })), findFirst: jest.fn(async () => ({ id: "order" })) },
      partnerPushDelivery: { create: jest.fn(async () => ({ id: "job" })), updateMany: jest.fn(async () => ({ count: 1 })), update: jest.fn() }
    };
    push = { sendBulkPushNotifications: jest.fn(async () => ({ accepted: 1 })) };
    service = new PartnerPushService(db as PrismaService, push);
  });
  it.each(["CUSTOMER_APP", "RIDER_APP"])("cannot repurpose a %s device", async appSurface => {
    db.deviceToken.findUnique.mockResolvedValue({ appSurface, userId: "owner" });
    await expect(service.register("owner", "ExpoPushToken[synthetic]", "IOS")).rejects.toThrow(); expect(db.deviceToken.upsert).not.toHaveBeenCalled();
  });
  it("requires current approval and opt-in", async () => {
    db.vendor.findFirst.mockResolvedValue(null);
    await expect(service.register("owner", "ExpoPushToken[synthetic]", "IOS")).rejects.toThrow();
    await service.orderChanged("order"); expect(push.sendBulkPushNotifications).not.toHaveBeenCalled();
  });
  it("sends only general lock-screen content to Partner registrations", async () => {
    await service.orderChanged("order");
    expect(db.deviceToken.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner", appSurface: "PARTNER_APP", provider: "EXPO", isActive: true } }));
    const messages = push.sendBulkPushNotifications.mock.calls[0][0];
    expect(messages[0].data).toEqual({ appSurface: "PARTNER_APP", route: "order", entityId: "order" });
    expect(messages[0].body).toBe("Open KariGO Partner to view this update.");
    expect(JSON.stringify(messages)).not.toMatch(/phone|address|customerName|accountNumber/i);
  });
  it("does not send a queued event after ownership changes", async () => {
    db.order.findFirst.mockResolvedValue(null); await service.orderChanged("order");
    expect(push.sendBulkPushNotifications).not.toHaveBeenCalled();
  });
  it("disable removes only Partner registrations", async () => {
    await service.setPreferences("owner", false, true, false);
    expect(db.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "owner", appSurface: "PARTNER_APP" } });
  });
});
