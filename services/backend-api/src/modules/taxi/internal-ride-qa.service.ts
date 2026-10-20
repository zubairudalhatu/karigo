import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { CaptainWorkLockStage, CaptainWorkMode, NotificationChannel, NotificationType, Prisma, TaxiTripStatus } from "@prisma/client";
import { randomBytes, randomUUID } from "crypto";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { APPROVED_QA_CAPTAIN, InternalRideQaPolicy, QA_CLEANED, QA_CREATED, QA_ENTITY, QaFixture, qaPlaceholderPhone } from "./internal-ride-qa.policy";
import { RideRealtimeService } from "./ride-realtime.service";

const terminal = [TaxiTripStatus.COMPLETED, TaxiTripStatus.CANCELLED_BY_ADMIN, TaxiTripStatus.CANCELLED_BY_CUSTOMER, TaxiTripStatus.CANCELLED_BY_DRIVER, TaxiTripStatus.EXPIRED];
@Injectable()
export class InternalRideQaService {
  constructor(private readonly prisma: PrismaService, private readonly policy: InternalRideQaPolicy,
    private readonly work: CaptainWorkStateService, private readonly notifications: NotificationsService,
    private readonly realtime: RideRealtimeService) {}

  private async admin(actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true, adminRole: true, accountStatus: true, deletedAt: true } });
    if (user?.role !== "ADMIN" || user.adminRole !== "SUPER_ADMIN" || user.accountStatus !== "ACTIVE" || user.deletedAt) throw new ForbiddenException("An active authenticated SUPER_ADMIN is required.");
  }
  private audit(db: Prisma.TransactionClient, actorId: string, action: string, tripId: string, details: object) {
    return db.adminAuditLog.create({ data: { adminUserId: actorId, action, entityType: QA_ENTITY, entityId: tripId, newValue: details as Prisma.InputJsonValue } });
  }
  async create(actorId: string) {
    await this.admin(actorId); const windowId = this.policy.window();
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(191954513, 1)`;
      if (await tx.adminAuditLog.findFirst({ where: { action: QA_CREATED, entityType: QA_ENTITY, newValue: { path: ["windowId"], equals: windowId } } })) throw new ConflictException("This QA window has already consumed its one fixture.");
      const captain = await tx.user.findUnique({ where: { id: APPROVED_QA_CAPTAIN }, include: { customerProfile: true, vendor: true, rider: true, taxiDriverProfiles: true, captainWorkState: true } });
      const profile = captain?.taxiDriverProfiles[0];
      if (!captain || captain.role !== "RIDER" || captain.adminRole || captain.accountStatus !== "ACTIVE" || !captain.phoneVerified || captain.deletedAt || captain.customerProfile || captain.vendor || captain.taxiDriverProfiles.length !== 1 || profile?.status !== "ACTIVE") throw new ForbiddenException("Approved QA Captain is not eligible.");
      if (captain.captainWorkState?.activeWorkMode || captain.captainWorkState?.desiredDeliveryOnline || captain.captainWorkState?.desiredRideOnline || profile.isAvailableForTaxi || captain.rider?.availabilityStatus !== "OFFLINE" || await tx.taxiTrip.count({ where: { driverProfileId: profile.id, status: { notIn: terminal } } })) throw new ConflictException("QA Captain must have no work and be offline before fixture creation.");
      const marker = randomUUID(), tripId = randomUUID(), expiresAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
      // Reserve the target only in the server registry. Like a normal REQUESTED Ride,
      // the trip has no Captain binding until the atomic offer + OFFERED lock.
      // A disabled, unverified, non-login synthetic FK holder; never a real Customer or recipient.
      const customer = await tx.user.create({ data: { fullName: "INTERNAL QA — NO REAL CUSTOMER", role: "CUSTOMER", accountStatus: "DEACTIVATED", phoneNumber: qaPlaceholderPhone(windowId), email: null, passwordHash: `!INTERNAL_QA_NO_LOGIN:${randomBytes(32).toString("hex")}`, customerProfile: { create: { referralCode: `INTERNAL-QA-${marker}` } } }, include: { customerProfile: true } });
      const fixture: QaFixture = { marker, windowId, captainUserId: captain.id, driverProfileId: profile.id, customerUserId: customer.id, customerProfileId: customer.customerProfile!.id, expiresAt };
      await tx.taxiTrip.create({ data: { id: tripId, tripReference: `INTERNAL-QA-${marker}`, customerId: fixture.customerProfileId, driverProfileId: null,
        isTestMode: true, status: "REQUESTED", estimatedFareKobo: 0, finalFareKobo: 0, ridePinRequired: false,
        pickupAddress: "SYNTHETIC QA — public park pickup, Abuja", pickupLatitude: 9.0765, pickupLongitude: 7.4938, pickupContentSource: "USER_SUPPLIED",
        destinationAddress: "SYNTHETIC QA — public park destination, Abuja", destinationLatitude: 9.0768, destinationLongitude: 7.4993, destinationContentSource: "USER_SUPPLIED",
        stopLatitude: 9.0787, stopLongitude: 7.4973, stopContentSource: "USER_SUPPLIED", estimatedDistanceKm: null, estimatedDurationMin: null,
        customerNote: "INTERNAL QA / SYNTHETIC — NON-BILLABLE. No real Customer. Do not collect money or perform real transport.",
        events: { create: { actorType: "ADMIN", actorId, eventType: "INTERNAL_QA_CREATED", note: "Synthetic non-billable fixture created; not dispatched" } }
      } });
      await this.audit(tx, actorId, QA_CREATED, tripId, fixture);
      return { tripId, marker, expiresAt, captainUserId: captain.id, status: "REQUESTED", nonBillable: true, offered: false };
    }, { isolationLevel: "Serializable" });
  }

  async status(actorId: string, tripId: string) {
    await this.admin(actorId); const fixture = await this.policy.lookup(tripId);
    if (!fixture) throw new ForbiddenException("Not a server-authorized fixture.");
    const [trip, finances, cleaned] = await Promise.all([this.prisma.taxiTrip.findUnique({ where: { id: tripId }, select: { status: true } }), this.financialResiduals(tripId), this.prisma.adminAuditLog.findFirst({ where: { action: QA_CLEANED, entityType: QA_ENTITY, entityId: tripId } })]);
    return { tripId, marker: fixture.marker, status: trip?.status ?? (cleaned ? "CLEANED" : "RESIDUAL_CHECK_REQUIRED"), nonBillable: true, financialResiduals: finances };
  }

  async offer(actorId: string, tripId: string) {
    await this.admin(actorId); const fixture = await this.policy.assertTrip(tripId);
    if (!fixture) throw new ForbiddenException("Not a server-authorized fixture.");
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(191954513, 1)`;
      if (await tx.adminAuditLog.findFirst({ where: { action: "INTERNAL_RIDE_QA_OFFER_CLAIMED", entityType: QA_ENTITY, entityId: tripId } })) throw new ConflictException("Offer already attempted; no blind push retry.");
      await this.policy.assertTrip(tripId, fixture.captainUserId, tx);
      await this.work.acquireLock(tx, { userId: fixture.captainUserId, mode: CaptainWorkMode.RIDE, workId: tripId, stage: CaptainWorkLockStage.OFFERED, actorId });
      const changed = await tx.taxiTrip.updateMany({ where: { id: tripId, status: "REQUESTED", driverProfileId: null }, data: { driverProfileId: fixture.driverProfileId, status: "DRIVER_ASSIGNED" } });
      if (changed.count !== 1) throw new ConflictException("Fixture is no longer ready for its first offer.");
      await tx.taxiTripEvent.create({ data: { tripId, actorType: "ADMIN", actorId, eventType: "taxi.trip.driver_assigned", note: "SYNTHETIC QA — NON-BILLABLE offer to approved Captain only" } });
      await this.audit(tx, actorId, "INTERNAL_RIDE_QA_OFFER_CLAIMED", tripId, { marker: fixture.marker, recipient: fixture.captainUserId });
    });
    const notice = { userId: fixture.captainUserId, title: "SYNTHETIC CAPTAIN QA RIDE — NON-BILLABLE", message: "Internal QA only. No real Customer, fare or work payment.", type: NotificationType.RIDER_ASSIGNED, entityType: "TaxiTrip", entityId: tripId, metadata: { event: "RIDE_ASSIGNED", synthetic: true, route: "/tabs/dashboard" } };
    await this.notifications.createNotification(notice);
    // Same Production push path; its recipient filter enforces the single iOS QA registration.
    const push = await this.notifications.createNotification({ ...notice, channel: NotificationChannel.PUSH });
    this.realtime.emitToUser(fixture.captainUserId, "ride.lifecycle.updated", { rideId: tripId, status: "DRIVER_ASSIGNED", synthetic: true });
    return { tripId, push, offered: true, nonBillable: true };
  }

  async financialResiduals(tripId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const [settlements, ledger, receipts, receiptEmails] = await Promise.all([db.taxiRideSettlement.count({ where: { tripId } }), db.taxiRideFinancialLedgerEntry.count({ where: { tripId } }), db.taxiRideReceipt.count({ where: { tripId } }), db.taxiRideReceiptEmailDelivery.count({ where: { tripId } })]);
    return { settlements, ledger, receipts, receiptEmails };
  }

  async cleanup(actorId: string, tripId: string) {
    await this.admin(actorId); const fixture = await this.policy.lookup(tripId);
    if (!fixture) throw new ForbiddenException("Cleanup requires the immutable backend fixture registry.");
    try {
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(191954513, 1)`;
      const residuals = await this.financialResiduals(tripId, tx);
      if (Object.values(residuals).some(value => value !== 0)) throw new ConflictException({ code: "QA_FINANCIAL_RESIDUALS_BLOCK_CLEANUP", residuals });
      const trip = await tx.taxiTrip.findUnique({ where: { id: tripId } });
      if (!trip) { if (await tx.adminAuditLog.findFirst({ where: { action: QA_CLEANED, entityType: QA_ENTITY, entityId: tripId } })) return; throw new ConflictException("Fixture is missing without cleanup evidence."); }
      await this.policy.assertBinding(tripId, trip, fixture, tx);
      const work = await tx.captainWorkState.findUnique({ where: { userId: fixture.captainUserId } });
      if (work?.activeWorkMode && (work.activeWorkMode !== "RIDE" || work.activeRideTripId !== tripId)) throw new ConflictException("A different work lock exists; cleanup will not alter it.");
      await tx.captainWorkState.updateMany({ where: { userId: fixture.captainUserId }, data: { desiredDeliveryOnline: false, desiredRideOnline: false, activeWorkMode: null, activeDeliveryAssignmentId: null, activeRideTripId: null, lockStage: null, lockedAt: null, lastLocationAt: null, version: { increment: 1 } } });
      await tx.taxiDriverProfile.update({ where: { id: fixture.driverProfileId }, data: { isAvailableForTaxi: false, lastKnownLatitude: null, lastKnownLongitude: null, lastSeenAt: null } });
      await tx.rider.updateMany({ where: { userId: fixture.captainUserId }, data: { availabilityStatus: "OFFLINE", currentLatitude: null, currentLongitude: null, currentLocationUpdatedAt: null } });
      await tx.taxiRideCallSession.deleteMany({ where: { tripId } });
      await tx.taxiRideTracePoint.deleteMany({ where: { tripId } });
      await tx.notification.deleteMany({ where: { entityType: "TaxiTrip", entityId: tripId } });
      await tx.taxiTripEvent.deleteMany({ where: { tripId } });
      await tx.taxiTrip.delete({ where: { id: tripId } });
      await tx.customerProfile.delete({ where: { id: fixture.customerProfileId } });
      // Only the disabled identity created for this exact immutable fixture can be removed.
      const identity = await tx.user.findUnique({ where: { id: fixture.customerUserId } });
      if (!identity || identity.role !== "CUSTOMER" || identity.accountStatus !== "DEACTIVATED" || identity.phoneNumber !== qaPlaceholderPhone(fixture.windowId) || identity.email || identity.phoneVerified || identity.deletedAt || !identity.passwordHash.startsWith("!INTERNAL_QA_NO_LOGIN:")) throw new ConflictException("Synthetic FK identity changed; cleanup rolled back.");
      await tx.user.delete({ where: { id: fixture.customerUserId } });
      await this.audit(tx, actorId, QA_CLEANED, tripId, { marker: fixture.marker, financialMutations: 0, offline: true });
    }, { isolationLevel: "Serializable" });
    this.realtime.stopWaiting(tripId, new Date());
    this.realtime.emitToRide(tripId, "ride.lifecycle.updated", { rideId: tripId, status: "EXPIRED", eventType: "INTERNAL_QA_CLEANED", receiptReady: false });
    this.realtime.revokeRideAccess(tripId, fixture.captainUserId);
    const residuals = {
      trips: await this.prisma.taxiTrip.count({ where: { id: tripId } }),
      traces: await this.prisma.taxiRideTracePoint.count({ where: { tripId } }),
      calls: await this.prisma.taxiRideCallSession.count({ where: { tripId } }),
      notifications: await this.prisma.notification.count({ where: { entityType: "TaxiTrip", entityId: tripId } }),
      syntheticUsers: await this.prisma.user.count({ where: { id: fixture.customerUserId } }),
      syntheticCustomers: await this.prisma.customerProfile.count({ where: { id: fixture.customerProfileId } }),
      activeWork: await this.prisma.captainWorkState.count({ where: { userId: fixture.captainUserId, OR: [{ activeWorkMode: { not: null } }, { desiredRideOnline: true }, { desiredDeliveryOnline: true }] } }),
      ...await this.financialResiduals(tripId)
    };
    if (Object.values(residuals).some(value => value !== 0)) throw new ConflictException({ code: "QA_CLEANUP_RESIDUALS", residuals });
    return { tripId, cleaned: true, residuals, requiredOperatorAction: "Disable CAPTAIN_RIDE_QA_ENABLED and independently re-read Production configuration." };
    } catch (error) {
      // Keep evidence/financial rows intact, but stop this exact QA assignment and location uploads.
      await this.quarantine(actorId, tripId, fixture);
      throw error;
    }
  }

  private async quarantine(actorId: string, tripId: string, fixture: QaFixture) {
    await this.prisma.$transaction(async tx => {
      const trip = await tx.taxiTrip.findUnique({ where: { id: tripId } });
      const state = await tx.captainWorkState.findUnique({ where: { userId: fixture.captainUserId } });
      await this.policy.assertBinding(tripId, trip, fixture, tx);
      if (state?.activeWorkMode && state.activeRideTripId !== tripId) {
        throw new ConflictException({ code: "QA_QUARANTINE_BINDING_OR_LOCK_MISMATCH", tripId, requiredOperatorAction: "Disable the QA feature flag; inspect the immutable fixture binding and work lock. No unrelated work was changed." });
      }
      await tx.taxiTrip.update({ where: { id: tripId }, data: { status: "EXPIRED", cancelledAt: new Date() } });
      await tx.captainWorkState.updateMany({ where: { userId: fixture.captainUserId }, data: { desiredRideOnline: false, desiredDeliveryOnline: false, activeWorkMode: null, activeRideTripId: null, activeDeliveryAssignmentId: null, lockStage: null, lockedAt: null, lastLocationAt: null, version: { increment: 1 } } });
      await tx.taxiDriverProfile.update({ where: { id: fixture.driverProfileId }, data: { isAvailableForTaxi: false, lastKnownLatitude: null, lastKnownLongitude: null, lastSeenAt: null } });
      await tx.rider.updateMany({ where: { userId: fixture.captainUserId }, data: { availabilityStatus: "OFFLINE", currentLatitude: null, currentLongitude: null, currentLocationUpdatedAt: null } });
      await this.audit(tx, actorId, "INTERNAL_RIDE_QA_QUARANTINED", tripId, { marker: fixture.marker, requiredOperatorAction: "Inspect reported residual counts; no financial evidence was deleted." });
    });
    this.realtime.stopWaiting(tripId, new Date());
    this.realtime.emitToRide(tripId, "ride.lifecycle.updated", { rideId: tripId, status: "EXPIRED", eventType: "INTERNAL_QA_QUARANTINED", receiptReady: false });
    this.realtime.revokeRideAccess(tripId, fixture.captainUserId);
  }
}
