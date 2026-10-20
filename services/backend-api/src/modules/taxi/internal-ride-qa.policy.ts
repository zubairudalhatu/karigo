import { ForbiddenException, Global, Injectable, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";

// Read from the approved reviewer evidence, not from a request or an arbitrary Admin target.
export const APPROVED_QA_CAPTAIN = "226d2334-1df4-47ad-bac4-08cdde0e5f4a";
export const QA_CREATED = "INTERNAL_RIDE_QA_CREATED";
export const QA_CLEANED = "INTERNAL_RIDE_QA_CLEANED";
export const QA_ENTITY = "InternalRideQa";
export const QA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Injective UUID encoding into letters only: normalization can never produce a dialable number.
// One immutable window owns one disposable placeholder; never reserve a plausible real phone.
export function qaPlaceholderPhone(windowId: string): string {
  if (!QA_UUID.test(windowId)) throw new ForbiddenException("Invalid internal QA window.");
  return "INTERNAL_QA_" + windowId.replace(/-/g, "").toLowerCase()
    .replace(/[0-9a-f]/g, digit => String.fromCharCode(65 + parseInt(digit, 16)));
}
type Db = Prisma.TransactionClient | PrismaService;
export interface QaFixture {
  marker: string; windowId: string; captainUserId: string; driverProfileId: string;
  customerUserId: string; customerProfileId: string; expiresAt: string;
}

@Injectable()
export class InternalRideQaPolicy {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  window() {
    const enabled = String(this.config.get("CAPTAIN_RIDE_QA_ENABLED", false)) === "true";
    const windowId = this.config.get<string>("CAPTAIN_RIDE_QA_WINDOW_ID", "");
    let ids: unknown;
    try { ids = JSON.parse(this.config.get<string>("CAPTAIN_RIDE_QA_CAPTAIN_IDS", "[]")); } catch { ids = []; }
    if (!enabled || !QA_UUID.test(windowId) || !Array.isArray(ids) || ids.length !== 1 || ids[0] !== APPROVED_QA_CAPTAIN) {
      throw new ForbiddenException("Internal Captain QA window is closed.");
    }
    return windowId;
  }

  async lookup(tripId: string, db: Db = this.prisma): Promise<QaFixture | null> {
    const audit = await db.adminAuditLog.findFirst({ where: { action: QA_CREATED, entityType: QA_ENTITY, entityId: tripId }, orderBy: { createdAt: "asc" } });
    if (!audit) return null;
    const value = audit.newValue as unknown as QaFixture;
    if (!value || !QA_UUID.test(value.marker ?? "") || value.captainUserId !== APPROVED_QA_CAPTAIN || !QA_UUID.test(value.windowId ?? "") || !value.customerUserId || !value.customerProfileId || !value.driverProfileId || !Number.isFinite(Date.parse(value.expiresAt))) {
      throw new ForbiddenException("Invalid internal QA authority record.");
    }
    return value;
  }

  async assertTrip(tripId: string, userId?: string, db: Db = this.prisma) {
    const fixture = await this.lookup(tripId, db);
    if (!fixture) return null;
    if (await db.adminAuditLog.findFirst({ where: { action: "INTERNAL_RIDE_QA_QUARANTINED", entityType: QA_ENTITY, entityId: tripId } })) throw new ForbiddenException("Internal QA fixture is quarantined; cleanup is required.");
    if (this.window() !== fixture.windowId || Date.parse(fixture.expiresAt) <= Date.now() || (userId && userId !== fixture.captainUserId)) {
      throw new ForbiddenException("Internal QA fixture is not authorized for this operation.");
    }
    const trip = await db.taxiTrip.findUnique({ where: { id: tripId }, select: { driverProfileId: true, customerId: true, isTestMode: true, status: true } });
    await this.assertBinding(tripId, trip, fixture, db);
    return fixture;
  }

  async assertBinding(tripId: string, trip: { driverProfileId: string | null; customerId: string; isTestMode: boolean; status: string } | null, fixture: QaFixture, db: Db = this.prisma) {
    if (!trip || trip.customerId !== fixture.customerProfileId || !trip.isTestMode) throw new ForbiddenException("Internal QA fixture binding changed.");
    if (trip.driverProfileId === fixture.driverProfileId) return;
    // Only an unoffered REQUESTED fixture (or its quarantined/expired remnant)
    // may be unassigned. Removing a binding after an offer must fail closed.
    if (trip.driverProfileId === null && ["REQUESTED", "EXPIRED"].includes(trip.status) &&
      !await db.adminAuditLog.findFirst({ where: { action: "INTERNAL_RIDE_QA_OFFER_CLAIMED", entityType: QA_ENTITY, entityId: tripId } })) return;
    throw new ForbiddenException("Internal QA fixture binding changed.");
  }

  async armedCaptain(userId: string) {
    if (userId !== APPROVED_QA_CAPTAIN) return false;
    let windowId: string;
    try { windowId = this.window(); } catch { return false; }
    const record = await this.prisma.adminAuditLog.findFirst({ where: { action: QA_CREATED, entityType: QA_ENTITY, newValue: { path: ["windowId"], equals: windowId } } });
    if (!record?.entityId) return false;
    await this.assertTrip(record.entityId, userId);
    return true;
  }

  async forbidFinancial(tripId: string, db: Db = this.prisma) {
    if (await this.lookup(tripId, db)) throw new ForbiddenException("Synthetic QA Rides are non-billable; financial effects are prohibited.");
  }
}

@Global()
@Module({ imports: [PrismaModule], providers: [InternalRideQaPolicy], exports: [InternalRideQaPolicy] })
export class InternalRideQaPolicyModule {}
