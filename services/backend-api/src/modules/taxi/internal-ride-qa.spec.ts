import "reflect-metadata";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validate } from "class-validator";
import { APPROVED_QA_CAPTAIN, InternalRideQaPolicy, QA_CREATED, QA_ENTITY } from "./internal-ride-qa.policy";
import { InternalRideQaService } from "./internal-ride-qa.service";
import { InternalRideQaController } from "./internal-ride-qa.controller";
import { RideFinanceService } from "./ride-finance.service";
import { RideReceiptEmailService } from "./ride-receipt-email.service";
import { RideCallService } from "./ride-call.service";
import { RideCommunicationsService } from "./ride-communications.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PushNotificationProvider } from "../notifications/providers/push-notification.provider";
import { TaxiService } from "./taxi.service";
import { CreateTaxiTripDto } from "./dto/create-taxi-trip.dto";
import * as pricing from "./ride-pricing-policy";

const adminId = "10000000-0000-4000-8000-000000000001";
const customerId = "10000000-0000-4000-8000-000000000002";
const customerProfileId = "10000000-0000-4000-8000-000000000003";
const profileId = "10000000-0000-4000-8000-000000000004";
const windowId = "10000000-0000-4000-8000-000000000005";

function harness(values: Record<string, unknown> = {}) {
  const config = new ConfigService({ CAPTAIN_RIDE_QA_ENABLED: "true", CAPTAIN_RIDE_QA_WINDOW_ID: windowId, CAPTAIN_RIDE_QA_CAPTAIN_IDS: JSON.stringify([APPROVED_QA_CAPTAIN]), ...values });
  const audits: any[] = []; let trip: any = null;
  const state: any = { desiredRideOnline: false, desiredDeliveryOnline: false, activeWorkMode: null, activeRideTripId: null, lockStage: null };
  const profile: any = { id: profileId, userId: APPROVED_QA_CAPTAIN, status: "ACTIVE", isAvailableForTaxi: false };
  const identity: any = { id: customerId, role: "CUSTOMER", accountStatus: "DEACTIVATED", phoneNumber: null, email: null, phoneVerified: false, deletedAt: null, passwordHash: "!INTERNAL_QA_NO_LOGIN:synthetic", customerProfile: { id: customerProfileId } };
  const captain: any = { id: APPROVED_QA_CAPTAIN, role: "RIDER", adminRole: null, accountStatus: "ACTIVE", phoneVerified: true, deletedAt: null, customerProfile: null, vendor: null, captainWorkState: state, rider: { availabilityStatus: "OFFLINE" }, taxiDriverProfiles: [profile] };
  const admin: any = { role: "ADMIN", adminRole: "SUPER_ADMIN", accountStatus: "ACTIVE", deletedAt: null };
  const db: any = {
    user: { count: jest.fn(async () => 0), findUnique: jest.fn(async ({ where }: any) => where.id === adminId ? admin : where.id === APPROVED_QA_CAPTAIN ? captain : where.id === customerId ? identity : null), create: jest.fn(async () => identity), delete: jest.fn() },
    adminAuditLog: { findFirst: jest.fn(async ({ where }: any) => audits.find(a => a.action === where.action && a.entityType === where.entityType && (!where.entityId || a.entityId === where.entityId) && (!where.newValue || a.newValue.windowId === where.newValue.equals))), create: jest.fn(async ({ data }: any) => { audits.push(data); return data; }) },
    taxiTrip: { count: jest.fn(async () => 0), create: jest.fn(async ({ data }: any) => (trip = { ...data, updatedAt: new Date() })), findUnique: jest.fn(async () => trip), update: jest.fn(async ({ data }: any) => Object.assign(trip, data, { updatedAt: new Date() })), updateMany: jest.fn(async ({ where, data }: any) => { if (trip?.status !== where.status) return { count: 0 }; Object.assign(trip, data); return { count: 1 }; }), delete: jest.fn(async () => { trip = null; }) },
    taxiDriverProfile: { update: jest.fn(async ({ data }: any) => Object.assign(profile, data)) },
    rider: { updateMany: jest.fn(async () => ({ count: 1 })) },
    captainWorkState: { count: jest.fn(async () => 0), findUnique: jest.fn(async () => state), updateMany: jest.fn(async ({ data }: any) => { Object.assign(state, data); return { count: 1 }; }) },
    taxiTripEvent: { create: jest.fn(), deleteMany: jest.fn() },
    taxiRideSettlement: { count: jest.fn(async () => 0), upsert: jest.fn() },
    taxiRideFinancialLedgerEntry: { count: jest.fn(async () => 0), createMany: jest.fn() },
    taxiRideReceipt: { count: jest.fn(async () => 0), upsert: jest.fn() },
    taxiRideReceiptEmailDelivery: { count: jest.fn(async () => 0), upsert: jest.fn() },
    taxiRideCallSession: { deleteMany: jest.fn(), count: jest.fn(async () => 0), create: jest.fn() },
    taxiRideTracePoint: { deleteMany: jest.fn(), count: jest.fn(async () => 0) },
    notification: { count: jest.fn(async () => 0), deleteMany: jest.fn(), create: jest.fn() }, customerProfile: { count: jest.fn(async () => 0), delete: jest.fn() },
    $executeRaw: jest.fn(), $transaction: jest.fn()
  };
  // Serialize the test transaction harness; production takes a PostgreSQL advisory lock as well.
  let serial: Promise<any> = Promise.resolve();
  db.$transaction.mockImplementation((callback: any) => { const run = serial.then(() => callback(db)); serial = run.catch(() => undefined); return run; });
  const work: any = { acquireLock: jest.fn(async (_db, input) => { if (!state.desiredRideOnline || state.activeWorkMode) throw new ConflictException(); Object.assign(state, { activeWorkMode: "RIDE", activeRideTripId: input.workId, lockStage: "OFFERED" }); }), releaseLock: jest.fn(async () => Object.assign(state, { activeWorkMode: null, activeRideTripId: null, lockStage: null })) };
  const realtime: any = { emitToUser: jest.fn(), emitToRide: jest.fn(), stopWaiting: jest.fn(), revokeRideAccess: jest.fn() };
  const notifications: any = { createNotification: jest.fn(async () => ({ accepted: true })) };
  const policy = new InternalRideQaPolicy(db, config);
  const service = new InternalRideQaService(db, policy, work, notifications, realtime);
  return { db, config, audits, captain, admin, state, profile, identity, work, realtime, notifications, policy, service, trip: () => trip };
}

describe("restricted internal Captain QA authorization", () => {
  it.each([{}, { CAPTAIN_RIDE_QA_ENABLED: "false" }, { CAPTAIN_RIDE_QA_ENABLED: "1" }])("defaults closed without a valid explicit window/allowlist: %j", values => {
    const policy = new InternalRideQaPolicy({} as any, new ConfigService(values));
    expect(() => policy.window()).toThrow(ForbiddenException);
  });
  it.each(["[]", "not-json", JSON.stringify([adminId]), JSON.stringify([APPROVED_QA_CAPTAIN, adminId])])("rejects unapproved or expanded allowlists %s", ids => {
    expect(() => harness({ CAPTAIN_RIDE_QA_CAPTAIN_IDS: ids }).policy.window()).toThrow(ForbiddenException);
  });
  it("requires both authenticated ADMIN and SUPER_ADMIN on every administrative route", () => {
    expect(Reflect.getMetadata("roles", InternalRideQaController)).toEqual(["ADMIN"]);
    expect(Reflect.getMetadata("adminRoles", InternalRideQaController)).toEqual(["SUPER_ADMIN"]);
    expect(Reflect.getMetadata("__guards__", InternalRideQaController)).toHaveLength(3);
  });
  it.each(["RIDER", "CUSTOMER", "VENDOR"])("rejects a %s actor before any fixture write", async role => {
    const h = harness(); h.admin.role = role;
    await expect(h.service.create(adminId)).rejects.toThrow(ForbiddenException);
    expect(h.db.user.create).not.toHaveBeenCalled(); expect(h.db.taxiTrip.create).not.toHaveBeenCalled();
  });
  it("rejects suspended Admins and non-approved QA Captains", async () => {
    const h = harness(); h.admin.accountStatus = "SUSPENDED";
    await expect(h.service.create(adminId)).rejects.toThrow(ForbiddenException);
    h.admin.accountStatus = "ACTIVE"; h.captain.accountStatus = "PENDING";
    await expect(h.service.create(adminId)).rejects.toThrow(ForbiddenException);
  });
  it("ignores caller-controlled synthetic flags and IDs: the create control takes actor only", async () => {
    const h = harness(); const controller = new InternalRideQaController(h.service);
    const result = await controller.create({ id: adminId } as any);
    expect(result.captainUserId).toBe(APPROVED_QA_CAPTAIN);
    expect(h.trip()).toMatchObject({ isTestMode: true, estimatedFareKobo: 0, finalFareKobo: 0, driverProfileId: profileId, pickupContentSource: "USER_SUPPLIED", stopContentSource: "USER_SUPPLIED" });
    expect(h.identity).toMatchObject({ accountStatus: "DEACTIVATED", phoneNumber: null, email: null, phoneVerified: false });
    expect(h.db.$executeRaw).toHaveBeenCalled();
  });
  it("rejects client isTestMode/fare injection on the ordinary DTO", async () => {
    const dto = Object.assign(new CreateTaxiTripDto(), { isTestMode: true, estimatedFareKobo: 0 });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(e => e.property === "isTestMode")).toBe(true);
    expect(errors.some(e => e.property === "estimatedFareKobo")).toBe(true);
  });
  it("does not interpret zero fare/isTestMode as an authority registry", async () => {
    const h = harness(); expect(await h.policy.lookup(adminId)).toBeNull();
    expect(await h.policy.assertTrip(adminId, adminId)).toBeNull();
  });
  it("consumes only one fixture per window, including concurrent creates", async () => {
    const h = harness(); const results = await Promise.allSettled([h.service.create(adminId), h.service.create(adminId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(h.db.taxiTrip.create).toHaveBeenCalledTimes(1);
  });
  it("blocks wrong subjects, changed binding, expired windows, and OFF transitions", async () => {
    const h = harness(); const f = await h.service.create(adminId);
    await expect(h.policy.assertTrip(f.tripId, adminId)).rejects.toThrow(ForbiddenException);
    h.trip().driverProfileId = adminId;
    await expect(h.policy.assertTrip(f.tripId, APPROVED_QA_CAPTAIN)).rejects.toThrow(ForbiddenException);
    h.trip().driverProfileId = profileId; h.audits[0].newValue.expiresAt = new Date(0).toISOString();
    await expect(h.policy.assertTrip(f.tripId, APPROVED_QA_CAPTAIN)).rejects.toThrow(ForbiddenException);
    h.config.set("CAPTAIN_RIDE_QA_ENABLED", "false");
    await expect(h.service.offer(adminId, f.tripId)).rejects.toThrow(ForbiddenException);
  });
});

describe("internal QA operational and financial fences", () => {
  it("offers once, through the existing notification path, only to the approved Captain", async () => {
    const h = harness(); const f = await h.service.create(adminId); h.state.desiredRideOnline = true;
    await h.service.offer(adminId, f.tripId);
    expect(h.work.acquireLock).toHaveBeenCalledTimes(1);
    expect(h.notifications.createNotification).toHaveBeenCalledTimes(2);
    expect(h.notifications.createNotification.mock.calls.every(([n]: any[]) => n.userId === APPROVED_QA_CAPTAIN && n.type === "RIDER_ASSIGNED" && n.title.includes("SYNTHETIC"))).toBe(true);
    await expect(h.service.offer(adminId, f.tripId)).rejects.toThrow(ConflictException);
    expect(h.notifications.createNotification).toHaveBeenCalledTimes(2);
  });
  it("does not blindly retry an ambiguous offer push", async () => {
    const h = harness(); const f = await h.service.create(adminId); h.state.desiredRideOnline = true;
    h.notifications.createNotification.mockRejectedValueOnce(new Error("ambiguous"));
    await expect(h.service.offer(adminId, f.tripId)).rejects.toThrow("ambiguous");
    await expect(h.service.offer(adminId, f.tripId)).rejects.toThrow(ConflictException);
    expect(h.notifications.createNotification).toHaveBeenCalledTimes(1);
  });
  it("hard-blocks direct settlement, cancellation ledger and receipt-email entry points", async () => {
    const h = harness(); const f = await h.service.create(adminId);
    const finance = new RideFinanceService(h.db, h.config, {} as any, h.notifications, h.policy);
    await expect(finance.createCompletedSettlement(h.db, { tripId: f.tripId } as any)).rejects.toThrow(ForbiddenException);
    await expect(finance.createClosedRideOutcome(h.db, { tripId: f.tripId } as any)).rejects.toThrow(ForbiddenException);
    const emails = new RideReceiptEmailService(h.db, h.config, h.policy);
    await expect(emails.enqueueAutomatic(h.db, { tripId: f.tripId } as any)).rejects.toThrow(ForbiddenException);
    expect(h.db.taxiRideSettlement.upsert).not.toHaveBeenCalled(); expect(h.db.taxiRideFinancialLedgerEntry.createMany).not.toHaveBeenCalled(); expect(h.db.taxiRideReceiptEmailDelivery.upsert).not.toHaveBeenCalled();
  });
  it("runs real lifecycle completion hooks without entering minimum-fare/finance/receipt branches", async () => {
    const h = harness(); const f = await h.service.create(adminId); Object.assign(h.trip(), { status: "ARRIVED_DESTINATION", events: [], pickupContentSource: "USER_SUPPLIED", destinationContentSource: "USER_SUPPLIED", stopContentSource: "USER_SUPPLIED" });
    Object.assign(h.state, { desiredRideOnline: true, activeWorkMode: "RIDE", activeRideTripId: f.tripId, lockStage: "IN_PROGRESS" });
    const fare = jest.spyOn(pricing, "applyCategoryMinimumRideFare");
    const service: any = Object.create(TaxiService.prototype);
    Object.assign(service, { prisma: h.db, config: h.config, internalQa: h.policy, captainWorkState: h.work, rideRealtime: h.realtime, rideCommunications: { endCallsForTerminalRide: jest.fn(async () => undefined) }, rideFinance: { createCompletedSettlement: jest.fn() }, receiptEmails: { enqueueAutomatic: jest.fn(), processPendingSoon: jest.fn() } });
    service.assertTaxiStagingEnabled = jest.fn(); service.requireDriverTrip = jest.fn(async () => ({ profile: h.profile, trip: h.trip() })); service.formatTrip = jest.fn((trip: any) => ({ status: trip.status, finalFareKobo: trip.finalFareKobo }));
    await expect(service.riderCompleteTrip(APPROVED_QA_CAPTAIN, f.tripId)).resolves.toEqual({ status: "COMPLETED", finalFareKobo: 0 });
    expect(fare).not.toHaveBeenCalled(); expect(service.rideFinance.createCompletedSettlement).not.toHaveBeenCalled(); expect(service.receiptEmails.enqueueAutomatic).not.toHaveBeenCalled(); expect(service.receiptEmails.processPendingSoon).not.toHaveBeenCalled();
    expect(h.db.taxiRideSettlement.upsert).not.toHaveBeenCalled(); expect(h.db.taxiRideFinancialLedgerEntry.createMany).not.toHaveBeenCalled(); expect(h.db.taxiRideReceipt.upsert).not.toHaveBeenCalled();
    expect(h.state.desiredRideOnline).toBe(false); expect(h.profile.isAvailableForTaxi).toBe(false); expect(h.work.releaseLock).toHaveBeenCalled(); expect(h.audits.some(a => a.action === "INTERNAL_RIDE_QA_TRANSITION")).toBe(true); fare.mockRestore();
  });
  it.each([0, 100, 169999])("keeps the ordinary Abuja minimum unchanged for %i kobo", amount => {
    expect(pricing.applyCategoryMinimumRideFare(amount, "ECONOMY", "Abuja").rideFareKobo).toBe(170000);
  });
  it("permits the mic context but never creates an Agora session/token or external call", async () => {
    const h = harness(); const f = await h.service.create(adminId); const calls: any = { initiate: jest.fn() };
    const communications = new RideCommunicationsService(h.db, h.config, h.notifications, calls, h.realtime, h.policy);
    await expect(communications.callSession({ ...h.trip(), status: "ACCEPTED", driverProfileId: profileId } as any, APPROVED_QA_CAPTAIN, "CAPTAIN")).rejects.toThrow(BadRequestException);
    expect(calls.initiate).not.toHaveBeenCalled(); expect(h.notifications.createNotification).not.toHaveBeenCalled(); expect(h.db.taxiRideCallSession.create).not.toHaveBeenCalled();
    const providerCalls = new RideCallService(h.config, h.db, h.notifications, h.realtime, h.policy);
    await expect(providerCalls.initiate({ tripId: f.tripId } as any)).rejects.toThrow(ForbiddenException);
  });
});

describe("notification isolation and cleanup", () => {
  it.each(["EMAIL", "SMS", "WHATSAPP"])("suppresses %s even when addressed to QA", async channel => {
    const h = harness(); const f = await h.service.create(adminId); const send = jest.fn();
    const service = new NotificationsService(h.db, { send } as any, { send } as any, { send } as any, { send } as any, { send } as any, h.policy);
    await expect(service.createNotification({ userId: APPROVED_QA_CAPTAIN, title: "QA", message: "QA", type: "RIDER_ASSIGNED", channel, entityType: "TaxiTrip", entityId: f.tripId } as any)).resolves.toMatchObject({ accepted: false }); expect(send).not.toHaveBeenCalled();
  });
  it("suppresses Customer/other-Captain pushes and non-assignment messages", async () => {
    const h = harness(); const f = await h.service.create(adminId); const send = jest.fn(); const service = new NotificationsService(h.db, { send } as any, { send } as any, { send } as any, { send } as any, { send } as any, h.policy);
    for (const userId of [customerId, adminId]) await expect(service.createNotification({ userId, title: "QA", message: "QA", type: "RIDER_ASSIGNED", channel: "PUSH", entityType: "TaxiTrip", entityId: f.tripId })).resolves.toMatchObject({ accepted: false });
    expect(send).not.toHaveBeenCalled();
  });
  it("selects one IOS/EXPO/RIDER_APP token and refuses fanout", async () => {
    const h = harness(); const f = await h.service.create(adminId); h.db.deviceToken = { findMany: jest.fn(async () => [{ token: "synthetic-one" }, { token: "synthetic-two" }]) }; const push: any = { sendBulkPushNotifications: jest.fn() }; const service = new PushNotificationProvider(h.db, push, h.policy);
    await expect(service.send({ userId: APPROVED_QA_CAPTAIN, title: "QA", message: "QA", type: "RIDER_ASSIGNED", entityType: "TaxiTrip", entityId: f.tripId } as any)).rejects.toThrow(ForbiddenException);
    expect(h.db.deviceToken.findMany.mock.calls[0][0].where).toMatchObject({ userId: APPROVED_QA_CAPTAIN, platform: "IOS", provider: "EXPO", appSurface: "RIDER_APP" });expect(push.sendBulkPushNotifications).not.toHaveBeenCalled();
  });
  it("cleans only the bound fixture after flag OFF; preserves Captain and immutable audit", async () => {
    const h = harness(); const f = await h.service.create(adminId); h.config.set("CAPTAIN_RIDE_QA_ENABLED", "false");
    await expect(h.service.cleanup(adminId, f.tripId)).resolves.toMatchObject({ cleaned: true });
    expect(h.db.user.delete).toHaveBeenCalledWith({ where: { id: customerId } }); expect(h.db.customerProfile.delete).toHaveBeenCalledWith({ where: { id: customerProfileId } });
    expect(h.db.taxiRideTracePoint.deleteMany).toHaveBeenCalledWith({ where: { tripId: f.tripId } }); expect(h.db.notification.deleteMany).toHaveBeenCalledWith({ where: { entityType: "TaxiTrip", entityId: f.tripId } });expect(h.state.desiredRideOnline).toBe(false);expect(h.realtime.revokeRideAccess).toHaveBeenCalledWith(f.tripId, APPROVED_QA_CAPTAIN);
    h.config.set("CAPTAIN_RIDE_QA_ENABLED", "true"); await expect(h.service.create(adminId)).rejects.toThrow(ConflictException);
  });
  it("quarantines rather than deleting any financial residuals", async () => {
    const h = harness(); const f = await h.service.create(adminId); h.db.taxiRideSettlement.count.mockResolvedValue(1);
    await expect(h.service.cleanup(adminId, f.tripId)).rejects.toThrow(ConflictException);
    expect(h.db.taxiTrip.delete).not.toHaveBeenCalled(); expect(h.trip().status).toBe("EXPIRED"); expect(h.audits.some(a => a.action === "INTERNAL_RIDE_QA_QUARANTINED")).toBe(true); expect(h.state.activeWorkMode).toBeNull();
    await expect(h.policy.assertTrip(f.tripId, APPROVED_QA_CAPTAIN)).rejects.toThrow(ForbiddenException);
  });
  it("never cleans a normal Ride or a different active work lock", async () => {
    const h = harness(); await expect(h.service.cleanup(adminId, adminId)).rejects.toThrow(ForbiddenException); expect(h.db.taxiTrip.delete).not.toHaveBeenCalled();
    const f = await h.service.create(adminId); Object.assign(h.state, { activeWorkMode: "DELIVERY", activeDeliveryAssignmentId: adminId });
    await expect(h.service.cleanup(adminId, f.tripId)).rejects.toThrow(ConflictException); expect(h.db.taxiTrip.delete).not.toHaveBeenCalled(); expect(h.state.activeWorkMode).toBe("DELIVERY");
  });
});
