import { AccountStatus, CaptainWorkLockStage, CaptainWorkMode, RiderStatus, TaxiDriverProfileStatus, UserRole } from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";
import { CaptainWorkStateService } from "./captain-work-state.service";
import { PrismaService } from "../../prisma/prisma.service";

function userWithModes(input?: {
  riderStatus?: RiderStatus;
  rideStatus?: TaxiDriverProfileStatus;
  activeWorkMode?: CaptainWorkMode | null;
  desiredDeliveryOnline?: boolean;
  desiredRideOnline?: boolean;
  lastLocationAt?: Date | null;
}) {
  const now = new Date();
  const activeWorkMode = input?.activeWorkMode ?? null;
  return {
    id: "captain-user",
    role: UserRole.RIDER,
    fullName: "Demo Captain",
    phoneNumber: "+2348030000000",
    email: "captain@example.test",
    accountStatus: AccountStatus.ACTIVE,
    phoneVerified: true,
    deletedAt: null,
    rider: {
      id: "delivery-profile",
      userId: "captain-user",
      verificationStatus: input?.riderStatus ?? RiderStatus.ACTIVE,
      availabilityStatus: RiderStatus.OFFLINE
    },
    taxiDriverProfiles: [{
      id: "ride-profile",
      userId: "captain-user",
      status: input?.rideStatus ?? TaxiDriverProfileStatus.ACTIVE,
      isAvailableForTaxi: false
    }],
    captainWorkState: {
      id: "work-state",
      userId: "captain-user",
      desiredDeliveryOnline: input?.desiredDeliveryOnline ?? false,
      desiredRideOnline: input?.desiredRideOnline ?? false,
      activeWorkMode,
      activeDeliveryAssignmentId: activeWorkMode === CaptainWorkMode.DELIVERY ? "delivery-1" : null,
      activeRideTripId: activeWorkMode === CaptainWorkMode.RIDE ? "ride-1" : null,
      lockStage: activeWorkMode ? CaptainWorkLockStage.IN_PROGRESS : null,
      lockedAt: activeWorkMode ? now : null,
      lastAvailabilityChangeAt: now,
      lastLocationAt: input?.lastLocationAt ?? now,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  };
}

describe("CaptainWorkStateService", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    captainWorkState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    rider: { update: jest.fn(), updateMany: jest.fn() },
    taxiDriverProfile: { update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new CaptainWorkStateService(prisma as unknown as PrismaService, audit as unknown as AdminAuditService);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CAPTAIN_LOCATION_STALE_SECONDS = "120";
  });

  afterEach(() => {
    delete process.env.CAPTAIN_LOCATION_STALE_SECONDS;
  });

  it("keeps Ride online when Delivery application is approved but activation is pending", async () => {
    const user = userWithModes({
      riderStatus: RiderStatus.PENDING_APPROVAL,
      rideStatus: TaxiDriverProfileStatus.ACTIVE,
      desiredDeliveryOnline: true,
      desiredRideOnline: true
    });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState);

    const result = await service.getForUser("captain-user");

    expect(result.deliveryEligibility).toMatchObject({
      eligible: false,
      reasonCode: "ACTIVATION_PENDING"
    });
    expect(result.rideEligibility).toMatchObject({
      eligible: true,
      reasonCode: "AVAILABLE"
    });
    expect(result.effectiveDeliveryOnline).toBe(false);
    expect(result.effectiveRideOnline).toBe(true);
  });

  it("pauses Delivery with an explicit reason while a Ride assignment is active", async () => {
    const user = userWithModes({
      riderStatus: RiderStatus.ACTIVE,
      rideStatus: TaxiDriverProfileStatus.ACTIVE,
      activeWorkMode: CaptainWorkMode.RIDE,
      desiredDeliveryOnline: true,
      desiredRideOnline: true
    });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState);

    const result = await service.getForUser("captain-user");

    expect(result.activeWorkMode).toBe(CaptainWorkMode.RIDE);
    expect(result.deliveryEligibility).toMatchObject({
      eligible: false,
      reasonCode: "ACTIVE_RIDE_LOCK"
    });
    expect(result.rideEligibility).toMatchObject({
      eligible: true,
      reasonCode: "AVAILABLE"
    });
    expect(result.effectiveDeliveryOnline).toBe(false);
    expect(result.effectiveRideOnline).toBe(false);
  });

  it("allows location-only GPS refresh while an assignment is active", async () => {
    const user = userWithModes({
      activeWorkMode: CaptainWorkMode.RIDE,
      desiredDeliveryOnline: true,
      desiredRideOnline: true
    });
    const tx = {
      captainWorkState: { update: jest.fn() },
      rider: { update: jest.fn() },
      taxiDriverProfile: { update: jest.fn() }
    };
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState).mockResolvedValueOnce({
      ...user.captainWorkState,
      lastLocationAt: new Date()
    });
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    await expect(service.updateAvailability("captain-user", {
      latitude: 12.0022,
      longitude: 8.592
    })).resolves.toMatchObject({ activeWorkMode: CaptainWorkMode.RIDE });

    expect(tx.captainWorkState.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "captain-user" },
      data: expect.objectContaining({ lastLocationAt: expect.any(Date) })
    }));
    expect(tx.rider.update).toHaveBeenCalled();
    expect(tx.taxiDriverProfile.update).toHaveBeenCalled();
  });

  it("updates GPS location without mutating availability when no assignment is active", async () => {
    const user = userWithModes({
      activeWorkMode: null,
      desiredDeliveryOnline: true,
      desiredRideOnline: true
    });
    const tx = {
      captainWorkState: { update: jest.fn() },
      rider: { update: jest.fn() },
      taxiDriverProfile: { update: jest.fn() }
    };
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState).mockResolvedValueOnce({
      ...user.captainWorkState,
      lastLocationAt: new Date()
    });
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    await service.updateAvailability("captain-user", {
      latitude: 12.0022,
      longitude: 8.592
    });

    expect(tx.captainWorkState.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "captain-user" },
      data: expect.not.objectContaining({
        desiredDeliveryOnline: expect.any(Boolean),
        desiredRideOnline: expect.any(Boolean),
        lastAvailabilityChangeAt: expect.any(Date)
      })
    }));
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("blocks effective online state when the saved location is stale", async () => {
    const user = userWithModes({
      riderStatus: RiderStatus.ACTIVE,
      rideStatus: TaxiDriverProfileStatus.ACTIVE,
      desiredDeliveryOnline: true,
      desiredRideOnline: true,
      lastLocationAt: new Date(Date.now() - 180_000)
    });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState);

    const result = await service.getForUser("captain-user");

    expect(result.deliveryEligibility).toMatchObject({
      eligible: false,
      reasonCode: "LOCATION_STALE"
    });
    expect(result.rideEligibility).toMatchObject({
      eligible: false,
      reasonCode: "LOCATION_STALE"
    });
    expect(result.effectiveDeliveryOnline).toBe(false);
    expect(result.effectiveRideOnline).toBe(false);
  });

  it("keeps an offline mode available when the other mode has stale desired online state", async () => {
    const user = userWithModes({
      riderStatus: RiderStatus.ACTIVE,
      rideStatus: TaxiDriverProfileStatus.ACTIVE,
      desiredDeliveryOnline: true,
      desiredRideOnline: false,
      lastLocationAt: new Date(Date.now() - 180_000)
    });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState);

    const result = await service.getForUser("captain-user");

    expect(result.deliveryEligibility).toMatchObject({
      eligible: false,
      reasonCode: "LOCATION_STALE"
    });
    expect(result.rideEligibility).toMatchObject({
      eligible: true,
      reasonCode: "AVAILABLE"
    });
    expect(result.effectiveDeliveryOnline).toBe(false);
    expect(result.effectiveRideOnline).toBe(false);
  });

  it("returns profile inactive when an operational profile has been suspended", async () => {
    const user = userWithModes({
      riderStatus: RiderStatus.SUSPENDED,
      rideStatus: TaxiDriverProfileStatus.SUSPENDED,
      desiredDeliveryOnline: true,
      desiredRideOnline: true
    });
    prisma.user.findUnique.mockResolvedValueOnce(user);
    prisma.captainWorkState.findUnique.mockResolvedValueOnce(user.captainWorkState);

    const result = await service.getForUser("captain-user");

    expect(result.deliveryEligibility).toMatchObject({
      eligible: false,
      reasonCode: "PROFILE_INACTIVE"
    });
    expect(result.rideEligibility).toMatchObject({
      eligible: false,
      reasonCode: "PROFILE_INACTIVE"
    });
  });
});
