import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { RideCallService } from "./ride-call.service";

const now = new Date("2026-08-22T10:00:00.000Z");
const baseSession: any = {
  id: "10000000-0000-4000-8000-000000000001",
  tripId: "20000000-0000-4000-8000-000000000001",
  initiatorUserId: "customer-user",
  initiatorRole: "CUSTOMER",
  recipientUserId: "captain-user",
  recipientRole: "CAPTAIN",
  state: "RINGING",
  provider: "AGORA",
  providerChannel: "kgr_private_test_channel",
  providerChannelHash: "c".repeat(64),
  initiatorRtcUid: 101,
  recipientRtcUid: 202,
  ringingAt: now,
  acceptedAt: null,
  connectedAt: null,
  declinedAt: null,
  missedAt: null,
  endedAt: null,
  endedByUserId: null,
  endReason: null,
  durationSeconds: null,
  createdAt: now,
  updatedAt: now,
  lastTokenExpiresAt: null
};

describe("RideCallService", () => {
  let stored: any;
  const values: Record<string, unknown> = {
    RIDE_IN_APP_CALL_ENABLED: true,
    RIDE_CALL_PROVIDER: "agora",
    AGORA_APP_ID: "a".repeat(32),
    AGORA_APP_CERTIFICATE: "b".repeat(32),
    AGORA_RTC_TOKEN_TTL_SECONDS: 600,
    RIDE_CALL_RING_TIMEOUT_SECONDS: 45
  };
  const config: any = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => values[key])
  };
  const prisma: any = {
    taxiRideCallSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    taxiTripEvent: { create: jest.fn() },
    $transaction: jest.fn()
  };
  const notifications: any = { createNotification: jest.fn() };
  const realtime: any = { emitToUser: jest.fn() };
  let service: RideCallService;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = { ...baseSession };
    prisma.taxiRideCallSession.findUnique.mockImplementation(async () => stored);
    prisma.taxiRideCallSession.findMany.mockResolvedValue([]);
    prisma.taxiRideCallSession.findFirst.mockResolvedValue(null);
    prisma.taxiRideCallSession.create.mockImplementation(async ({ data }: any) => {
      stored = { ...baseSession, ...data };
      return stored;
    });
    prisma.taxiRideCallSession.update.mockImplementation(async ({ data }: any) => {
      stored = { ...stored, ...data, updatedAt: now };
      return stored;
    });
    prisma.taxiTripEvent.create.mockResolvedValue({ id: "audit" });
    prisma.$transaction.mockImplementation(async (operation: any) => operation(prisma));
    notifications.createNotification.mockResolvedValue({ accepted: true });
    service = new RideCallService(config, prisma, notifications, realtime);
  });

  it("initiates an opaque server-controlled channel and exposes credentials only to the caller", async () => {
    const initiated = await service.initiate({
      tripId: baseSession.tripId,
      tripReference: "KGO-RIDE-TEST",
      participantUserId: "customer-user",
      participantRole: "CUSTOMER",
      participantLabel: "Amina Customer",
      recipientUserId: "captain-user",
      recipientRole: "CAPTAIN",
      recipientLabel: "Kabiru Captain"
    });
    expect(initiated).toMatchObject({ state: "RINGING", participant: "initiator", recordingEnabled: false });
    expect(initiated.credential).toMatchObject({ appId: values.AGORA_APP_ID, uid: expect.any(Number), channel: expect.stringMatching(/^kgr_[a-f0-9]{36}$/) });
    expect(realtime.emitToUser).toHaveBeenCalledWith("captain-user", "ride.call.incoming", expect.not.objectContaining({ credential: expect.anything() }));
    expect(JSON.stringify(realtime.emitToUser.mock.calls)).not.toContain(String(values.AGORA_APP_CERTIFICATE));
    expect(JSON.stringify(notifications.createNotification.mock.calls)).not.toContain(String(values.AGORA_APP_CERTIFICATE));
  });

  it("renews a short-lived credential only for an accepted participant", async () => {
    stored = { ...stored, state: "ACCEPTED", acceptedAt: now };
    const renewed = await service.renewToken(stored.id, "captain-user");
    expect(renewed).toMatchObject({ state: "ACCEPTED", participant: "recipient" });
    expect(renewed.credential).toMatchObject({ appId: values.AGORA_APP_ID, uid: 202, channel: stored.providerChannel });
  });

  it("accepts exactly once, returns recipient credentials and emits only safe call metadata", async () => {
    const accepted = await service.accept(stored.id, "captain-user");
    const repeated = await service.accept(stored.id, "captain-user");
    expect(accepted).toMatchObject({ state: "ACCEPTED", participant: "recipient", recordingEnabled: false });
    expect(accepted.credential).toMatchObject({ appId: values.AGORA_APP_ID, uid: 202, channel: stored.providerChannel });
    expect(repeated.state).toBe("ACCEPTED");
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledTimes(1);
    expect(realtime.emitToUser).toHaveBeenCalledWith("customer-user", "ride.call.accepted", expect.not.objectContaining({ credential: expect.anything() }));
    expect(JSON.stringify(realtime.emitToUser.mock.calls)).not.toContain(String(values.AGORA_APP_CERTIFICATE));
    expect(JSON.stringify(realtime.emitToUser.mock.calls)).not.toContain(stored.providerChannel);
  });

  it("rejects acceptance by the caller and access by unrelated accounts", async () => {
    await expect(service.accept(stored.id, "customer-user")).rejects.toBeInstanceOf(ForbiddenException);
    prisma.taxiRideCallSession.findUnique.mockResolvedValueOnce(null);
    await expect(service.end(stored.id, "other-user")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a valid participant when the call session belongs to a different Ride route", async () => {
    await expect(service.accept(stored.id, "captain-user", "30000000-0000-4000-8000-000000000001"))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires acceptance before connected and makes end idempotent", async () => {
    await expect(service.connected(stored.id, "captain-user")).rejects.toBeInstanceOf(BadRequestException);
    stored = { ...stored, state: "CONNECTED", connectedAt: new Date(Date.now() - 5_000) };
    const ended = await service.end(stored.id, "customer-user", "ENDED_BY_PARTICIPANT<script>");
    const repeated = await service.end(stored.id, "customer-user");
    expect(ended).toMatchObject({ state: "ENDED", endReason: "ENDED_BY_PARTICIPANTscript" });
    expect(repeated.state).toBe("ENDED");
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledTimes(1);
    expect(realtime.emitToUser).toHaveBeenCalledWith("captain-user", "ride.call.remote_ended", expect.objectContaining({ state: "ENDED" }));
  });

  it("declines an incoming call idempotently without minting credentials", async () => {
    const declined = await service.decline(stored.id, "captain-user");
    const repeated = await service.decline(stored.id, "captain-user");
    expect(declined).toMatchObject({ state: "DECLINED", credential: undefined });
    expect(repeated.state).toBe("DECLINED");
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledTimes(1);
  });

  it("ends live calls when a Ride reaches a terminal lifecycle state", async () => {
    stored = { ...stored, state: "CONNECTED", connectedAt: new Date(Date.now() - 2_000) };
    prisma.taxiRideCallSession.findMany.mockResolvedValue([stored]);
    await service.endCallsForRide(stored.tripId, "RIDE_COMPLETED");
    expect(stored).toMatchObject({ state: "ENDED", endReason: "RIDE_COMPLETED" });
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ actorType: "SYSTEM", actorId: null, eventType: "taxi.trip.call.ended" })
    }));
    expect(realtime.emitToUser).toHaveBeenCalledWith("captain-user", "ride.call.remote_ended", expect.objectContaining({ state: "ENDED" }));
  });

  it("marks stale ringing calls missed with a private system audit event", async () => {
    stored = { ...stored, ringingAt: new Date("2026-08-22T00:00:00.000Z") };
    prisma.taxiRideCallSession.findMany.mockResolvedValue([stored]);
    prisma.taxiRideCallSession.findFirst.mockResolvedValue(null);
    await expect(service.recover(stored.tripId, "customer-user")).resolves.toBeNull();
    expect(stored).toMatchObject({ state: "MISSED", endReason: "MISSED" });
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ actorType: "SYSTEM", actorId: null, eventType: "taxi.trip.call.missed" })
    }));
    expect(realtime.emitToUser).toHaveBeenCalledWith("captain-user", "ride.call.missed", expect.objectContaining({ state: "MISSED" }));
  });
});
