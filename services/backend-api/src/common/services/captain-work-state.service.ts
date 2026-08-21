import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountStatus,
  CaptainWorkLockStage,
  CaptainWorkMode,
  DeliveryCaptainApplicationStatus,
  LaunchServiceType,
  Prisma,
  RiderStatus,
  TaxiApplicationStatus,
  TaxiDriverProfileStatus
} from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LaunchOperationsService } from "../../modules/launch-operations/launch-operations.service";
import { captainIsApprovedForOperatingArea, captainOperatingAreaFromCoordinates, captainOperatingAreaSummary } from "../../modules/platform/captain-operating-areas";

type PrismaTx = Prisma.TransactionClient | PrismaService;

type WorkStateUser = Prisma.UserGetPayload<{
  include: {
    rider: true;
    taxiDriverProfiles: { orderBy: { createdAt: "desc" }; take: 1 };
    deliveryCaptainApplications: { where: { status: "APPROVED" }; orderBy: { createdAt: "desc" }; take: 1 };
    taxiDriverApplications: { where: { status: "APPROVED" }; orderBy: { createdAt: "desc" }; take: 1 };
    captainWorkState: true;
  };
}>;

export interface CaptainAvailabilityUpdate {
  deliveryOnline?: boolean;
  rideOnline?: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  tracePoints?: Array<{
    clientPointId: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    speedMetersPerSecond?: number;
    headingDegrees?: number;
    recordedAt: string;
    source?: "FOREGROUND" | "BACKGROUND" | "OFFLINE_BUFFER";
  }>;
}

type CaptainAvailabilityReasonCode =
  | "AVAILABLE"
  | "APPLICATION_NOT_APPROVED"
  | "ACTIVATION_PENDING"
  | "PROFILE_INACTIVE"
  | "LOCATION_STALE"
  | "ACTIVE_DELIVERY_LOCK"
  | "ACTIVE_RIDE_LOCK"
  | "SUSPENDED";

export interface AcquireCaptainWorkLockInput {
  userId: string;
  mode: CaptainWorkMode;
  workId: string;
  stage: CaptainWorkLockStage;
  actorId?: string;
  reference?: string;
}

export interface ReleaseCaptainWorkLockInput {
  userId: string;
  mode: CaptainWorkMode;
  workId: string;
  actorId?: string;
}

@Injectable()
export class CaptainWorkStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly launchOperations: LaunchOperationsService
  ) {}

  async getForUser(userId: string) {
    const user = await this.loadUser(userId);
    const state = await this.ensureState(this.prisma, userId, user);
    return this.formatState(state, user);
  }

  async updateAvailability(userId: string, dto: CaptainAvailabilityUpdate) {
    const user = await this.loadUser(userId);
    const state = await this.ensureState(this.prisma, userId, user);
    const locationOnly = dto.deliveryOnline === undefined && dto.rideOnline === undefined && this.hasValidLocation(dto);
    if (locationOnly) {
      return this.updateLocationOnly(userId, user, dto);
    }
    if (state.activeWorkMode) {
      throw this.busyConflict(state, "Availability cannot be changed while an assignment is active.");
    }

    const deliveryEligibility = this.deliveryEligibility(user);
    const rideEligibility = this.rideEligibility(user);
    if (dto.deliveryOnline === true && !deliveryEligibility.eligible) {
      throw new BadRequestException(deliveryEligibility.reason ?? "Delivery availability is not available for this account.");
    }
    if (dto.rideOnline === true && !rideEligibility.eligible) {
      throw new BadRequestException(rideEligibility.reason ?? "Ride availability is not available for this account.");
    }

    if (dto.deliveryOnline === true) await this.assertOperatingAreaCanGoOnline(user, CaptainWorkMode.DELIVERY, dto);
    if (dto.rideOnline === true) await this.assertOperatingAreaCanGoOnline(user, CaptainWorkMode.RIDE, dto);
    const updated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const workState = await tx.captainWorkState.update({
        where: { userId },
        data: {
          ...(dto.deliveryOnline !== undefined ? { desiredDeliveryOnline: dto.deliveryOnline } : {}),
          ...(dto.rideOnline !== undefined ? { desiredRideOnline: dto.rideOnline } : {}),
          lastAvailabilityChangeAt: now,
          ...(this.hasValidLocation(dto) ? { lastLocationAt: now } : {}),
          version: { increment: 1 }
        }
      });

      if (user.rider && dto.deliveryOnline !== undefined) {
        await tx.rider.update({
          where: { id: user.rider.id },
          data: {
            availabilityStatus: dto.deliveryOnline ? RiderStatus.ONLINE : RiderStatus.OFFLINE,
            ...(this.hasValidLocation(dto) ? {
              currentLatitude: new Prisma.Decimal(dto.latitude),
              currentLongitude: new Prisma.Decimal(dto.longitude),
              currentLocationUpdatedAt: now
            } : {})
          }
        });
      }

      const rideProfile = user.taxiDriverProfiles[0];
      if (rideProfile && dto.rideOnline !== undefined) {
        await tx.taxiDriverProfile.update({
          where: { id: rideProfile.id },
          data: {
            isAvailableForTaxi: dto.rideOnline,
            ...(this.hasValidLocation(dto) ? {
              lastKnownLatitude: new Prisma.Decimal(dto.latitude),
              lastKnownLongitude: new Prisma.Decimal(dto.longitude),
              lastSeenAt: now
            } : {})
          }
        });
      }

      return workState;
    });

    if (dto.deliveryOnline !== undefined) {
      await this.audit.record(userId, dto.deliveryOnline ? "CAPTAIN_DELIVERY_AVAILABILITY_ENABLED" : "CAPTAIN_DELIVERY_AVAILABILITY_DISABLED", "CaptainWorkState", updated.id, {
        desiredDeliveryOnline: dto.deliveryOnline
      });
    }
    if (dto.rideOnline !== undefined) {
      await this.audit.record(userId, dto.rideOnline ? "CAPTAIN_RIDE_AVAILABILITY_ENABLED" : "CAPTAIN_RIDE_AVAILABILITY_DISABLED", "CaptainWorkState", updated.id, {
        desiredRideOnline: dto.rideOnline
      });
    }

    return this.getForUser(userId);
  }

  private async updateLocationOnly(userId: string, user: WorkStateUser, dto: CaptainAvailabilityUpdate) {
    if (!this.hasValidLocation(dto)) {
      throw new BadRequestException("Valid Captain location is required.");
    }
    const approvedCaptain = this.deliveryEligibility(user).eligible || this.rideEligibility(user).eligible;
    if (!approvedCaptain) {
      throw new BadRequestException("Captain activation is required before readiness location can be verified.");
    }
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.captainWorkState.update({
        where: { userId },
        data: {
          lastLocationAt: now,
          version: { increment: 1 }
        }
      });
      if (user.rider) {
        await tx.rider.update({
          where: { id: user.rider.id },
          data: {
            currentLatitude: new Prisma.Decimal(dto.latitude),
            currentLongitude: new Prisma.Decimal(dto.longitude),
            currentLocationUpdatedAt: now
          }
        });
      }
      const rideProfile = user.taxiDriverProfiles[0];
      if (rideProfile) {
        await tx.taxiDriverProfile.update({
          where: { id: rideProfile.id },
          data: {
            lastKnownLatitude: new Prisma.Decimal(dto.latitude),
            lastKnownLongitude: new Prisma.Decimal(dto.longitude),
            lastSeenAt: now
          }
        });
      }
      const activeRideTripId = user.captainWorkState?.activeWorkMode === CaptainWorkMode.RIDE
        ? user.captainWorkState.activeRideTripId
        : null;
      if (activeRideTripId && dto.tracePoints?.length) {
        const earliest = Date.now() - 24 * 60 * 60 * 1000;
        const latest = Date.now() + 5 * 60 * 1000;
        const points = dto.tracePoints.filter((point) => {
          const recordedAt = new Date(point.recordedAt).getTime();
          return Number.isFinite(recordedAt) && recordedAt >= earliest && recordedAt <= latest
            && point.latitude >= -90 && point.latitude <= 90
            && point.longitude >= -180 && point.longitude <= 180;
        });
        if (points.length) {
          await tx.taxiRideTracePoint.createMany({
            data: points.map((point) => ({
              tripId: activeRideTripId,
              clientPointId: point.clientPointId,
              latitude: new Prisma.Decimal(point.latitude),
              longitude: new Prisma.Decimal(point.longitude),
              accuracyMeters: point.accuracyMeters === undefined ? null : new Prisma.Decimal(point.accuracyMeters),
              speedMetersPerSecond: point.speedMetersPerSecond === undefined ? null : new Prisma.Decimal(point.speedMetersPerSecond),
              headingDegrees: point.headingDegrees === undefined ? null : new Prisma.Decimal(point.headingDegrees),
              recordedAt: new Date(point.recordedAt),
              source: point.source ?? "FOREGROUND"
            })),
            skipDuplicates: true
          });
        }
      }
    });
    return this.getForUser(userId);
  }

  async acquireLock(tx: PrismaTx, input: AcquireCaptainWorkLockInput) {
    const state = await this.ensureState(tx, input.userId);
    this.assertDesiredModeOnline(state, input.mode);
    const sameWork = input.mode === CaptainWorkMode.DELIVERY
      ? state.activeWorkMode === CaptainWorkMode.DELIVERY && state.activeDeliveryAssignmentId === input.workId
      : state.activeWorkMode === CaptainWorkMode.RIDE && state.activeRideTripId === input.workId;
    if (state.activeWorkMode && !sameWork) throw this.busyConflict(state);

    const where = input.mode === CaptainWorkMode.DELIVERY
      ? {
          userId: input.userId,
          OR: [
            { activeWorkMode: null },
            { activeWorkMode: CaptainWorkMode.DELIVERY, activeDeliveryAssignmentId: input.workId }
          ]
        }
      : {
          userId: input.userId,
          OR: [
            { activeWorkMode: null },
            { activeWorkMode: CaptainWorkMode.RIDE, activeRideTripId: input.workId }
          ]
        };
    const update = await tx.captainWorkState.updateMany({
      where,
      data: {
        activeWorkMode: input.mode,
        activeDeliveryAssignmentId: input.mode === CaptainWorkMode.DELIVERY ? input.workId : null,
        activeRideTripId: input.mode === CaptainWorkMode.RIDE ? input.workId : null,
        lockStage: input.stage,
        lockedAt: new Date(),
        version: { increment: 1 }
      }
    });
    if (update.count !== 1) {
      const latest = await tx.captainWorkState.findUnique({ where: { userId: input.userId } });
      throw this.busyConflict(latest ?? state);
    }

    await tx.rider.updateMany({
      where: { userId: input.userId },
      data: { availabilityStatus: RiderStatus.BUSY }
    });
    await tx.taxiDriverProfile.updateMany({
      where: { userId: input.userId },
      data: { isAvailableForTaxi: false }
    });

    if (input.actorId) {
      await tx.adminAuditLog.create({
        data: {
          adminUserId: input.actorId,
          action: "CAPTAIN_CROSS_MODE_LOCK_ACQUIRED",
          entityType: "CaptainWorkState",
          entityId: state.id,
          newValue: {
            mode: input.mode,
            workId: input.workId,
            reference: input.reference,
            lockStage: input.stage
          } as Prisma.InputJsonValue
        }
      });
    }
  }

  async transitionLock(tx: PrismaTx, userId: string, mode: CaptainWorkMode, workId: string, stage: CaptainWorkLockStage) {
    await tx.captainWorkState.updateMany({
      where: {
        userId,
        activeWorkMode: mode,
        ...(mode === CaptainWorkMode.DELIVERY ? { activeDeliveryAssignmentId: workId } : { activeRideTripId: workId })
      },
      data: { lockStage: stage, version: { increment: 1 } }
    });
  }

  async releaseLock(tx: PrismaTx, input: ReleaseCaptainWorkLockInput) {
    const state = await this.ensureState(tx, input.userId);
    const update = await tx.captainWorkState.updateMany({
      where: {
        userId: input.userId,
        activeWorkMode: input.mode,
        ...(input.mode === CaptainWorkMode.DELIVERY ? { activeDeliveryAssignmentId: input.workId } : { activeRideTripId: input.workId })
      },
      data: {
        activeWorkMode: null,
        activeDeliveryAssignmentId: null,
        activeRideTripId: null,
        lockStage: null,
        lockedAt: null,
        version: { increment: 1 }
      }
    });
    if (update.count) {
      await this.restoreEffectiveAvailability(tx, input.userId);
      if (input.actorId) {
        await tx.adminAuditLog.create({
          data: {
            adminUserId: input.actorId,
            action: "CAPTAIN_CROSS_MODE_LOCK_RELEASED",
            entityType: "CaptainWorkState",
            entityId: state.id,
            newValue: { mode: input.mode, workId: input.workId } as Prisma.InputJsonValue
          }
        });
      }
    }
  }

  async restoreEffectiveAvailability(tx: PrismaTx, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        rider: true,
        taxiDriverProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
        deliveryCaptainApplications: { where: { status: DeliveryCaptainApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        taxiDriverApplications: { where: { status: TaxiApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        captainWorkState: true
      }
    });
    if (!user) return;
    const state = await this.ensureState(tx, userId, user);
    const accountActive = user.accountStatus === AccountStatus.ACTIVE && user.phoneVerified && !user.deletedAt;
    if (user.rider) {
      const deliveryOnline = accountActive && user.rider.verificationStatus === RiderStatus.ACTIVE && !state.activeWorkMode && state.desiredDeliveryOnline;
      await tx.rider.update({
        where: { id: user.rider.id },
        data: { availabilityStatus: deliveryOnline ? RiderStatus.ONLINE : RiderStatus.OFFLINE }
      });
    }
    const rideProfile = user.taxiDriverProfiles[0];
    if (rideProfile) {
      const rideOnline = accountActive && rideProfile.status === TaxiDriverProfileStatus.ACTIVE && !state.activeWorkMode && state.desiredRideOnline;
      await tx.taxiDriverProfile.update({
        where: { id: rideProfile.id },
        data: { isAvailableForTaxi: rideOnline }
      });
    }
  }

  private async loadUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rider: true,
        taxiDriverProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
        deliveryCaptainApplications: { where: { status: DeliveryCaptainApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        taxiDriverApplications: { where: { status: TaxiApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        captainWorkState: true
      }
    });
    if (!user) throw new NotFoundException("Captain account not found");
    return user;
  }

  private async ensureState(tx: PrismaTx, userId: string, userProjection?: WorkStateUser | null) {
    const existing = await tx.captainWorkState.findUnique({ where: { userId } });
    if (existing) return existing;
    const user = userProjection ?? await tx.user.findUnique({
      where: { id: userId },
      include: {
        rider: true,
        taxiDriverProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
        deliveryCaptainApplications: { where: { status: DeliveryCaptainApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        taxiDriverApplications: { where: { status: TaxiApplicationStatus.APPROVED }, orderBy: { createdAt: "desc" }, take: 1 },
        captainWorkState: true
      }
    });
    const rideProfile = user?.taxiDriverProfiles?.[0] ?? null;
    return tx.captainWorkState.create({
      data: {
        userId,
        desiredDeliveryOnline: user?.rider?.availabilityStatus === RiderStatus.ONLINE,
        desiredRideOnline: Boolean(rideProfile?.isAvailableForTaxi),
        lastAvailabilityChangeAt: new Date(),
        lastLocationAt: user?.rider?.currentLocationUpdatedAt ?? rideProfile?.lastSeenAt ?? null
      }
    });
  }

  private async assertOperatingAreaCanGoOnline(user: WorkStateUser, mode: CaptainWorkMode, dto: CaptainAvailabilityUpdate) {
    if (!this.hasValidLocation(dto)) {
      throw new BadRequestException("Current foreground location is required before going online.");
    }
    const currentArea = captainOperatingAreaFromCoordinates(dto.latitude, dto.longitude);
    const application = mode === CaptainWorkMode.RIDE
      ? user.taxiDriverApplications[0]
      : user.deliveryCaptainApplications[0];
    const rideProfile = user.taxiDriverProfiles[0];
    const legacyLocation = mode === CaptainWorkMode.RIDE
      ? { city: rideProfile?.city ?? application?.city, state: rideProfile?.state ?? application?.state }
      : { city: application?.city, state: application?.state };
    if (!currentArea || !application || !captainIsApprovedForOperatingArea(application, currentArea.id, legacyLocation)) {
      throw new BadRequestException("This Captain is not approved to operate in the current area.");
    }
    await this.launchOperations.assertCaptainCanReceive({
      city: currentArea.cityName,
      serviceType: mode === CaptainWorkMode.RIDE ? LaunchServiceType.RIDES : LaunchServiceType.PARCEL_DELIVERY,
      userId: user.id
    });
  }

  private deliveryEligibility(user: WorkStateUser) {
    if (!user.rider) return { eligible: false, reasonCode: "APPLICATION_NOT_APPROVED" as const, reason: "Delivery Captain profile is not prepared." };
    if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified || user.deletedAt) {
      return { eligible: false, reasonCode: "SUSPENDED" as const, reason: "Captain account is not active and phone-verified." };
    }
    if (user.rider.verificationStatus === RiderStatus.PENDING_APPROVAL) {
      return { eligible: false, reasonCode: "ACTIVATION_PENDING" as const, reason: "Delivery Captain activation is pending." };
    }
    if (user.rider.verificationStatus !== RiderStatus.ACTIVE) {
      return { eligible: false, reasonCode: "PROFILE_INACTIVE" as const, reason: "Delivery Captain profile is not active." };
    }
    return { eligible: true, reasonCode: "AVAILABLE" as const, reason: null };
  }

  private rideEligibility(user: WorkStateUser) {
    const rideProfile = user.taxiDriverProfiles[0];
    if (!rideProfile) return { eligible: false, reasonCode: "APPLICATION_NOT_APPROVED" as const, reason: "Ride Captain profile is not prepared." };
    if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified || user.deletedAt) {
      return { eligible: false, reasonCode: "SUSPENDED" as const, reason: "Captain account is not active and phone-verified." };
    }
    if (rideProfile.status === TaxiDriverProfileStatus.PENDING_ACTIVATION) {
      return { eligible: false, reasonCode: "ACTIVATION_PENDING" as const, reason: "Ride Captain activation is pending." };
    }
    if (rideProfile.status !== TaxiDriverProfileStatus.ACTIVE) {
      return { eligible: false, reasonCode: "PROFILE_INACTIVE" as const, reason: "Ride Captain profile is not active." };
    }
    return { eligible: true, reasonCode: "AVAILABLE" as const, reason: null };
  }

  private assertDesiredModeOnline(state: Awaited<ReturnType<CaptainWorkStateService["ensureState"]>>, mode: CaptainWorkMode) {
    if (mode === CaptainWorkMode.DELIVERY && !state.desiredDeliveryOnline) {
      throw new BadRequestException("Captain is not online for Delivery assignments.");
    }
    if (mode === CaptainWorkMode.RIDE && !state.desiredRideOnline) {
      throw new BadRequestException("Captain is not online for Ride assignments.");
    }
  }

  private busyConflict(state: Awaited<ReturnType<CaptainWorkStateService["ensureState"]>>, message?: string) {
    const activeWorkReference = state.activeWorkMode === CaptainWorkMode.DELIVERY
      ? state.activeDeliveryAssignmentId
      : state.activeWorkMode === CaptainWorkMode.RIDE
        ? state.activeRideTripId
        : null;
    return new ConflictException({
      code: "CAPTAIN_BUSY_OTHER_MODE",
      activeWorkMode: state.activeWorkMode,
      activeWorkReference,
      message: message ?? `Captain already has an active ${state.activeWorkMode === CaptainWorkMode.DELIVERY ? "Delivery assignment" : "Ride assignment"}.`
    });
  }

  private formatState(state: Awaited<ReturnType<CaptainWorkStateService["ensureState"]>>, user: WorkStateUser) {
    const deliveryEligibility = this.modeEligibilityWithState(this.deliveryEligibility(user), state, CaptainWorkMode.DELIVERY);
    const rideEligibility = this.modeEligibilityWithState(this.rideEligibility(user), state, CaptainWorkMode.RIDE);
    const currentArea = captainOperatingAreaFromCoordinates(
      Number(user.rider?.currentLatitude ?? user.taxiDriverProfiles[0]?.lastKnownLatitude),
      Number(user.rider?.currentLongitude ?? user.taxiDriverProfiles[0]?.lastKnownLongitude)
    );
    return {
      desiredDeliveryOnline: state.desiredDeliveryOnline,
      desiredRideOnline: state.desiredRideOnline,
      effectiveDeliveryOnline: state.desiredDeliveryOnline && !state.activeWorkMode && deliveryEligibility.eligible,
      effectiveRideOnline: state.desiredRideOnline && !state.activeWorkMode && rideEligibility.eligible,
      activeWorkMode: state.activeWorkMode,
      activeWorkReference: state.activeWorkMode === CaptainWorkMode.DELIVERY ? state.activeDeliveryAssignmentId : state.activeRideTripId,
      activeDeliveryAssignmentId: state.activeDeliveryAssignmentId,
      activeRideTripId: state.activeRideTripId,
      lockStage: state.lockStage,
      lockedAt: state.lockedAt?.toISOString() ?? null,
      lastAvailabilityChangeAt: state.lastAvailabilityChangeAt?.toISOString() ?? null,
      lastLocationAt: state.lastLocationAt?.toISOString() ?? null,
      deliveryEligibility,
      currentGpsArea: currentArea ? captainOperatingAreaSummary(currentArea) : null,
      rideEligibility
    };
  }

  private modeEligibilityWithState(
    eligibility: { eligible: boolean; reasonCode: CaptainAvailabilityReasonCode; reason: string | null },
    state: Awaited<ReturnType<CaptainWorkStateService["ensureState"]>>,
    mode: CaptainWorkMode
  ) {
    if (!eligibility.eligible) return eligibility;
    if (state.activeWorkMode && state.activeWorkMode !== mode) {
      const reasonCode: CaptainAvailabilityReasonCode = state.activeWorkMode === CaptainWorkMode.DELIVERY ? "ACTIVE_DELIVERY_LOCK" : "ACTIVE_RIDE_LOCK";
      return {
        eligible: false,
        reasonCode,
        reason: state.activeWorkMode === CaptainWorkMode.DELIVERY
          ? "Paused while a Delivery assignment is active."
          : "Paused while a Ride assignment is active."
      };
    }
    if (this.locationIsStale(state, mode)) {
      return {
        eligible: false,
        reasonCode: "LOCATION_STALE" as const,
        reason: "Update device GPS before going online."
      };
    }
    return eligibility;
  }

  private locationIsStale(state: Awaited<ReturnType<CaptainWorkStateService["ensureState"]>>, mode: CaptainWorkMode) {
    if (state.activeWorkMode) return false;
    const desiredOnline = mode === CaptainWorkMode.DELIVERY ? state.desiredDeliveryOnline : state.desiredRideOnline;
    if (!desiredOnline) return false;
    if (!state.lastLocationAt) return true;
    return Date.now() - state.lastLocationAt.getTime() > this.configuredLocationStaleMs();
  }

  private configuredLocationStaleMs() {
    const seconds = Number(process.env.CAPTAIN_LOCATION_STALE_SECONDS ?? process.env.RIDES_CAPTAIN_LOCATION_STALE_SECONDS ?? 90);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 90_000;
  }

  private hasValidLocation(dto: CaptainAvailabilityUpdate): dto is CaptainAvailabilityUpdate & { latitude: number; longitude: number } {
    return Number.isFinite(dto.latitude) &&
      Number.isFinite(dto.longitude) &&
      Number(dto.latitude) >= -90 &&
      Number(dto.latitude) <= 90 &&
      Number(dto.longitude) >= -180 &&
      Number(dto.longitude) <= 180;
  }
}
