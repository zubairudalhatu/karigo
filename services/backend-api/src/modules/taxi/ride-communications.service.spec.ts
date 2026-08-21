import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TaxiTripActorType, TaxiTripStatus } from "@prisma/client";
import { RideCommunicationsService } from "./ride-communications.service";

const now = new Date("2026-08-21T10:00:00.000Z");
const customerMessage = {
  id: "10000000-0000-4000-8000-000000000001",
  tripId: "20000000-0000-4000-8000-000000000001",
  actorType: TaxiTripActorType.CUSTOMER,
  actorId: "customer-user",
  eventType: "taxi.trip.message",
  note: "I'm at the pickup entrance",
  metadata: { deliveryState: "DELIVERED", senderRole: "CUSTOMER" },
  createdAt: now
};
const activeTrip: any = {
  id: customerMessage.tripId,
  tripReference: "KGO-RIDE-TEST",
  status: TaxiTripStatus.ACCEPTED,
  driverProfileId: "driver-profile",
  updatedAt: now,
  customer: { user: { id: "customer-user", fullName: "Amina Customer", phoneNumber: "+2348000000001" } },
  driverProfile: { userId: "captain-user", fullName: "Kabiru Captain", phoneNumber: "+2348000000002" },
  events: []
};

describe("RideCommunicationsService", () => {
  const prisma: any = {
    taxiTripEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn()
    }
  };
  const config: any = { get: jest.fn((_key: string, fallback: unknown) => fallback) };
  const notifications: any = { createNotification: jest.fn() };
  const calls: any = {
    readiness: jest.fn(() => ({ enabled: false, provider: null, recordingEnabled: false, reason: "No approved provider" })),
    createSession: jest.fn(() => Promise.resolve({ enabled: false, provider: null, recordingEnabled: false, reason: "No approved provider" }))
  };
  const service = new RideCommunicationsService(prisma, config, notifications, calls);

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((_key: string, fallback: unknown) => fallback);
    prisma.taxiTripEvent.findMany.mockResolvedValue([]);
    prisma.taxiTripEvent.count.mockResolvedValue(0);
    prisma.taxiTripEvent.create.mockImplementation(async ({ data }: any) => ({ ...customerMessage, ...data, id: customerMessage.id, createdAt: now }));
    notifications.createNotification.mockResolvedValue({ accepted: true });
    calls.readiness.mockReturnValue({ enabled: false, provider: null, recordingEnabled: false, reason: "No approved provider" });
    calls.createSession.mockResolvedValue({ enabled: false, provider: null, recordingEnabled: false, reason: "No approved provider" });
  });

  it("persists a Captain message and creates safe Customer in-app and push events", async () => {
    const result = await service.sendMessage(activeTrip, "captain-user", "CAPTAIN", { message: "I've arrived" });
    expect(result).toMatchObject({ senderRole: "CAPTAIN", deliveryState: "DELIVERED", message: "I've arrived" });
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      tripId: activeTrip.id, actorType: TaxiTripActorType.DRIVER, actorId: "captain-user", eventType: "taxi.trip.message"
    }) }));
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    for (const [notification] of notifications.createNotification.mock.calls) {
      expect(notification).toMatchObject({ userId: "customer-user", entityId: activeTrip.id });
      expect(notification.metadata).toEqual({ rideId: activeTrip.id, messageEventId: customerMessage.id, senderLabel: "Ride Captain" });
      expect(JSON.stringify(notification)).not.toContain("I've arrived");
    }
  });

  it("persists a Customer message and safely targets the assigned Captain", async () => {
    await service.sendMessage(activeTrip, "customer-user", "CUSTOMER", { message: "I'm outside" });
    expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: "captain-user" }));
  });

  it("returns paginated Ride-only history", async () => {
    prisma.taxiTripEvent.findMany.mockResolvedValueOnce([customerMessage]).mockResolvedValueOnce([]);
    prisma.taxiTripEvent.count.mockResolvedValue(1);
    const result = await service.listMessages(activeTrip, "CAPTAIN", { limit: 30 });
    expect(result).toMatchObject({ rideId: activeTrip.id, messageCount: 1, readOnly: false });
    expect(result.messages[0]).toMatchObject({ senderRole: "CUSTOMER", message: customerMessage.note });
  });

  it("rejects OTP, Ride PIN and payment-secret content", async () => {
    await expect(service.sendMessage(activeTrip, "customer-user", "CUSTOMER", { message: "My OTP is 123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiTripEvent.create).not.toHaveBeenCalled();
  });

  it("keeps completed Ride history read-only", async () => {
    const completed = { ...activeTrip, status: TaxiTripStatus.COMPLETED };
    await expect(service.sendMessage(completed, "captain-user", "CAPTAIN", { message: "Thank you" })).rejects.toBeInstanceOf(BadRequestException);
    prisma.taxiTripEvent.findMany.mockResolvedValue([]);
    await expect(service.listMessages(completed, "CUSTOMER", { limit: 30 })).resolves.toMatchObject({ readOnly: true });
  });

  it("expires closed conversation access after the support window", async () => {
    const expired = { ...activeTrip, status: TaxiTripStatus.COMPLETED, updatedAt: new Date("2020-01-01T00:00:00.000Z") };
    await expect(service.listMessages(expired, "CUSTOMER", { limit: 30 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns disabled in-app call readiness without fabricating a provider", async () => {
    await expect(service.callSession(activeTrip, "captain-user", "CAPTAIN")).resolves.toMatchObject({ enabled: false, provider: null });
  });

  it("keeps phone fallback behind an explicit contact request", () => {
    expect(service.contactOptions(activeTrip, "CAPTAIN")).toMatchObject({
      phoneFallbackAvailable: true,
      phoneFallbackLabel: "Call by phone",
      maskedNumberProviderRequiredForPublicLaunch: true
    });
  });
});
