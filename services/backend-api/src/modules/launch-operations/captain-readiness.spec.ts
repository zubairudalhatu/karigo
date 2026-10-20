import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";
import { CaptainReadinessDto } from "./dto/captain-readiness.dto";
import { validateReadinessLocation } from "./captain-readiness-location";
import { ControlledSupplyService } from "./controlled-supply.service";
import { LaunchOperationsService } from "./launch-operations.service";
import { AdminLaunchOperationsController, LaunchAvailabilityController } from "./launch-operations.controller";

const subject = "readiness-captain";
const fix = (latitude = 9.0765, longitude = 7.3986) => ({ city: "Abuja", latitude, longitude, recordedAt: new Date(Date.now() - 100).toISOString(), accuracyMeters: 15 });
function harness() {
  const app: any = { id: "application", status: "APPROVED", city: "Abuja", state: "FCT", operatingAreaIds: ["fct-abuja"], primaryOperatingAreaId: "fct-abuja", captainDocuments: [{ reviewStatus: "APPROVED" }] };
  const profile: any = { id: "profile", applicationId: app.id, application: app, city: "Abuja", state: "FCT", status: "ACTIVE", isAvailableForTaxi: false, lastKnownLatitude: null, lastKnownLongitude: null, lastSeenAt: null, vehicleMake: "QA", vehicleModel: "QA", vehiclePlateNumber: "LOCAL-QA" };
  const user: any = { id: subject, role: "RIDER", accountStatus: "ACTIVE", phoneVerified: true, deletedAt: null, lastLoginAt: new Date(), rider: null, taxiDriverProfiles: [profile], taxiDriverApplications: [app], deliveryCaptainApplications: [], captainWorkState: { desiredRideOnline: false, desiredDeliveryOnline: false, activeWorkMode: null, activeRideTripId: null, activeDeliveryAssignmentId: null, lastLocationAt: null } };
  let member = true, launchStage = "OPERATIONS_ONLY";
  const mutation = jest.fn(() => { throw new Error("READINESS_MUST_NOT_WRITE"); });
  const db: any = { user: { findUnique: jest.fn(async () => user), findMany: jest.fn(async () => user.deletedAt ? [] : [user]), update: mutation },
    launchMarketConfig: { findUnique: jest.fn(async ({ where }: any) => ({ cityCode: where.cityCode_serviceType.cityCode, serviceType: where.cityCode_serviceType.serviceType, isEnabled: true, launchStage, emergencyClosed: false, timezone: "Africa/Lagos", allowedZoneIds: null, operatingHours: null, activeFrom: null, activeUntil: null, captainLocationFreshMinutes: 15 })) },
    controlledSupplyMember: { findMany: jest.fn(async () => member ? [{ captainUserId: subject, enabled: true, memberType: "RIDE_CAPTAIN", groupId: "group", id: "member", group: { status: "ACTIVE", name: "Local QA" } }] : []), create: mutation, update: mutation },
    taxiDriverProfile: { update: mutation }, rider: { update: mutation }, captainWorkState: { update: mutation },
    taxiTrip: { create: mutation }, taxiRideTracePoint: { createMany: mutation }, payment: { create: mutation },
    launchCapacityDenial: { create: mutation }, adminAuditLog: { create: mutation } };
  const audit: any = { record: mutation };
  const controlled = new ControlledSupplyService(db, audit);
  const service = new LaunchOperationsService(db, new ConfigService(), audit, controlled);
  return { service, user, app, profile, db, mutation, setMember: (value: boolean) => { member = value; }, setStage: (value: string) => { launchStage = value; } };
}
const ride = (r: any) => r.services.find((s: any) => s.serviceType === "RIDES");

describe("transient Captain readiness", () => {
  it("resolves Abuja from fresh GPS, not the caller's Kano label, without writing telemetry/availability/work/finance", async () => {
    const h = harness(); const before = JSON.stringify(h.user);
    const result = await h.service.captainReadiness({ ...fix(), city: "Kano" }, subject);
    expect(result.readiness).toMatchObject({ locationState: "LOCATION_RESOLVED", currentArea: { cityName: "Abuja" }, accuracyMeters: 15 });
    expect(ride(result)).toMatchObject({ available: true, areaState: "AREA_APPROVED", accessState: "ELIGIBLE" });
    expect(h.mutation).not.toHaveBeenCalled(); expect(JSON.stringify(h.user)).toBe(before);
    expect(JSON.stringify(result)).not.toContain('"latitude"'); expect(JSON.stringify(result)).not.toContain('"longitude"');
    expect(h.db.user.findMany.mock.calls.every(([query]: any[]) => query.where.id === subject)).toBe(true);
  });
  it("resolves Kano but rejects an Abuja-only approval", async () => {
    const h = harness(); const result = await h.service.captainReadiness(fix(12.0022, 8.592), subject);
    expect(result.readiness.currentArea?.cityName).toBe("Kano");
    expect(ride(result)).toMatchObject({ available: false, reasonCode: "OPERATING_AREA_NOT_APPROVED", areaState: "AREA_NOT_APPROVED" });
    h.app.operatingAreaIds = ["kano-kano"]; h.app.primaryOperatingAreaId = "kano-kano";
    expect(ride(await h.service.captainReadiness(fix(12.0022, 8.592), subject))).toMatchObject({ available: true });
  });
  it("rejects a point outside both coordinate radii despite Abuja profile/city labels", async () => {
    const h = harness(); const result = await h.service.captainReadiness(fix(0, 0), subject);
    expect(result.readiness.currentArea).toBeNull();
    expect(ride(result)).toMatchObject({ available: false, areaState: "AREA_NOT_APPROVED" });
    expect(h.mutation).not.toHaveBeenCalled();
  });
  it("distinguishes absent coordinates from an unapproved area, even if a stored fix exists", async () => {
    const h = harness(); Object.assign(h.profile, { lastKnownLatitude: 9.0765, lastKnownLongitude: 7.3986, lastSeenAt: new Date() });
    const result = await h.service.captainReadiness({ city: "Abuja" }, subject);
    expect(result.readiness.locationState).toBe("LOCATION_UNKNOWN");
    expect(ride(result)).toMatchObject({ available: false, reasonCode: "LOCATION_UNKNOWN", areaState: "LOCATION_UNKNOWN" });
    Object.assign(h.profile, { lastKnownLatitude: null, lastKnownLongitude: null });
    expect(ride(await h.service.captainAvailability("Abuja", undefined, subject))).toMatchObject({ available: false, reasonCode: "LOCATION_UNKNOWN" });
  });
  it.each([
    [{ recordedAt: undefined }, "LOCATION_TIMESTAMP_UNKNOWN"],
    [{ recordedAt: new Date(Date.now() - 31_000).toISOString() }, "LOCATION_STALE"],
    [{ recordedAt: new Date(Date.now() + 60_000).toISOString() }, "LOCATION_TIMESTAMP_INVALID"],
    [{ accuracyMeters: null }, "LOCATION_ACCURACY_UNKNOWN"],
    [{ accuracyMeters: 251 }, "PRECISE_LOCATION_REQUIRED"]
  ])("fails closed with explicit unknown/stale/approximate metadata %j", async (change, reason) => {
    const h = harness(); const result = await h.service.captainReadiness({ ...fix(), ...change } as any, subject);
    expect(ride(result)).toMatchObject({ available: false, reasonCode: reason }); expect(h.mutation).not.toHaveBeenCalled();
  });
  it.each([{ latitude: 91 }, { longitude: -181 }, { latitude: NaN }, { longitude: undefined }, { accuracyMeters: -1 }])("rejects invalid location %j", change => {
    expect(() => validateReadinessLocation({ ...fix(), ...change } as any)).toThrow(BadRequestException);
  });
  it("does not grant controlled membership when the area is approved", async () => {
    const h = harness(); h.setMember(false); const result = await h.service.captainReadiness(fix(), subject);
    expect(ride(result)).toMatchObject({ available: false, reasonCode: "CONTROLLED_ACCESS_NOT_ENABLED", areaState: "AREA_APPROVED", accessState: "CONTROLLED_ACCESS_REQUIRED" });
    expect(h.mutation).not.toHaveBeenCalled();
  });
  it.each(["SUSPENDED", "PENDING", "DEACTIVATED"])("rejects account state %s", async status => {
    const h = harness(); h.user.accountStatus = status;
    expect(ride(await h.service.captainReadiness(fix(), subject)).available).toBe(false);
  });
  it("preserves rejected application, inactive profile and deleted-account gates", async () => {
    for (const change of ['application', 'profile', 'deleted']) {
      const h = harness(); if (change === 'application') h.app.status = 'REJECTED'; if (change === 'profile') h.profile.status = 'SUSPENDED'; if (change === 'deleted') h.user.deletedAt = new Date();
      expect(ride(await h.service.captainReadiness(fix(), subject)).available).toBe(false); expect(h.mutation).not.toHaveBeenCalled();
    }
  });
  it.each(["OFF", "PAUSED"])("retains launch %s denial", async stage => {
    const h = harness(); h.setStage(stage); expect(ride(await h.service.captainReadiness(fix(), subject)).available).toBe(false);
  });
  it("rejects caller-supplied identity/role/availability/trace fields and requires authenticated guards", async () => {
    const body = Object.assign(new CaptainReadinessDto(), fix(), { userId: "other", role: "ADMIN", rideOnline: true, tracePoints: [], membership: true, readinessProof: "forged" });
    const errors = await validate(body, { whitelist: true, forbidNonWhitelisted: true });
    for (const key of ["userId", "role", "rideOnline", "tracePoints", "membership", "readinessProof"]) expect(errors.some(e => e.property === key)).toBe(true);
    expect(Reflect.getMetadata('__guards__', LaunchAvailabilityController.prototype.captainReadiness)).toHaveLength(2);
    expect(Reflect.getMetadata('__httpCode__', LaunchAvailabilityController.prototype.captainReadiness)).toBe(200);
    expect(Reflect.getMetadata('__guards__', AdminLaunchOperationsController).map((guard: any) => guard.name)).toEqual(['JwtAuthGuard', 'RolesGuard', 'AdminRolesGuard']);
    expect(Reflect.getMetadata('roles', AdminLaunchOperationsController)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata('adminRoles', AdminLaunchOperationsController)).toEqual(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'DISPATCH_OFFICER']);
  });
});
