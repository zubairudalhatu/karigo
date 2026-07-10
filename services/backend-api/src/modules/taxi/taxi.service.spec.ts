import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TaxiApplicationStatus, TaxiDriverProfileStatus, TaxiTripStatus, TaxiVehicleOwnership, TaxiVehicleType, TaxiWaitlistStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TaxiService } from "./taxi.service";

const now = new Date("2026-07-10T10:00:00.000Z");

const application = {
  id: "00000000-0000-0000-0000-00000000a001",
  applicationReference: "KGO-TAXI-2026-ABC123",
  applicantUserId: null,
  fullName: "Demo Driver",
  phoneNumber: "+2348030000000",
  email: "driver@example.test",
  city: "Kano",
  state: "Kano",
  address: "Nasarawa GRA",
  driverLicenceNumber: "DL-123",
  driverLicenceExpiry: null,
  vehicleMake: "Toyota",
  vehicleModel: "Corolla",
  vehicleYear: 2015,
  vehicleColour: "Black",
  vehiclePlateNumber: "KGO-123AA",
  vehicleType: TaxiVehicleType.SEDAN,
  vehicleOwnership: TaxiVehicleOwnership.OWNER,
  notes: "Ready for review",
  status: TaxiApplicationStatus.SUBMITTED,
  adminNote: null,
  applicantVisibleNote: null,
  reviewedByAdminId: null,
  reviewedAt: null,
  createdAt: now,
  updatedAt: now,
  reviewedByAdmin: null
};

const waitlistEntry = {
  id: "00000000-0000-0000-0000-00000000b001",
  fullName: "Demo Customer",
  phoneNumber: "+2348030000001",
  email: "customer@example.test",
  city: "Kano",
  state: "Kano",
  pickupArea: "Bompai",
  note: "Interested in airport rides",
  status: TaxiWaitlistStatus.SUBMITTED,
  createdAt: now,
  updatedAt: now
};

const customerProfile = {
  id: "00000000-0000-0000-0000-00000000c001",
  userId: "customer-user"
};

const driverProfile = {
  id: "00000000-0000-0000-0000-00000000d001",
  userId: "rider-user",
  applicationId: application.id,
  fullName: "Demo Driver",
  phoneNumber: "+2348030000000",
  city: "Kano",
  state: "Kano",
  vehicleMake: "Toyota",
  vehicleModel: "Corolla",
  vehicleYear: 2015,
  vehicleColour: "Black",
  vehiclePlateNumber: "KGO-123AA",
  vehicleType: TaxiVehicleType.SEDAN,
  status: TaxiDriverProfileStatus.ACTIVE_TEST,
  isAvailableForTaxi: true,
  lastKnownLatitude: null,
  lastKnownLongitude: null,
  lastSeenAt: now,
  createdAt: now,
  updatedAt: now,
  application
};

const taxiTrip = {
  id: "00000000-0000-0000-0000-00000000e001",
  tripReference: "KGO-TAXI-TRIP-2026-ABC12345",
  customerId: customerProfile.id,
  driverProfileId: null,
  pickupAddress: "Tarauni, Kano",
  pickupLatitude: null,
  pickupLongitude: null,
  destinationAddress: "Zoo Road, Kano",
  destinationLatitude: null,
  destinationLongitude: null,
  estimatedDistanceKm: 6.5,
  estimatedDurationMin: 18,
  estimatedFareKobo: 304500,
  finalFareKobo: null,
  status: TaxiTripStatus.REQUESTED,
  tripPinHash: "$2b$10$hash",
  tripPinLastFour: "3456",
  cancellationReason: null,
  customerNote: null,
  driverNote: null,
  isTestMode: true,
  requestedAt: now,
  acceptedAt: null,
  arrivedAtPickupAt: null,
  startedAt: null,
  arrivedAtDestinationAt: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  customer: {
    id: customerProfile.id,
    user: { id: "customer-user", fullName: "Demo Customer", phoneNumber: "+2348030000001" }
  },
  driverProfile: null,
  events: []
};

describe("TaxiService", () => {
  const prisma: any = {
    taxiDriverApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    taxiWaitlistEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    customerProfile: {
      findUnique: jest.fn()
    },
    taxiDriverProfile: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    taxiTrip: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    taxiTripEvent: {
      create: jest.fn()
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma))
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };
  const service = new TaxiService(prisma as unknown as PrismaService, audit as unknown as AdminAuditService, config as never);

  function enableTaxiStaging() {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        TAXI_SERVICE_ENABLED: true,
        TAXI_STAGING_DISPATCH_ENABLED: true,
        TAXI_BASE_FARE_KOBO: 70000,
        TAXI_PER_KM_KOBO: 25000,
        TAXI_PER_MINUTE_KOBO: 4000,
        TAXI_MINIMUM_FARE_KOBO: 120000
      };
      return values[key] ?? fallback;
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.taxiDriverApplication.findUnique.mockResolvedValue(null);
    prisma.taxiDriverApplication.create.mockResolvedValue(application);
    prisma.taxiDriverApplication.findFirst.mockResolvedValue(application);
    prisma.taxiDriverApplication.findMany.mockResolvedValue([application]);
    prisma.taxiDriverApplication.update.mockResolvedValue({ ...application, status: TaxiApplicationStatus.UNDER_REVIEW, reviewedAt: now });
    prisma.taxiWaitlistEntry.create.mockResolvedValue(waitlistEntry);
    prisma.taxiWaitlistEntry.findMany.mockResolvedValue([waitlistEntry]);
    prisma.taxiWaitlistEntry.findUnique.mockResolvedValue(waitlistEntry);
    prisma.taxiWaitlistEntry.update.mockResolvedValue({ ...waitlistEntry, status: TaxiWaitlistStatus.CONTACTED });
    prisma.customerProfile.findUnique.mockResolvedValue(customerProfile);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(driverProfile);
    prisma.taxiDriverProfile.findMany.mockResolvedValue([driverProfile]);
    prisma.taxiDriverProfile.update.mockResolvedValue(driverProfile);
    prisma.taxiDriverProfile.upsert.mockResolvedValue(driverProfile);
    prisma.taxiDriverProfile.count.mockResolvedValue(1);
    prisma.taxiTrip.findUnique.mockResolvedValue(null);
    prisma.taxiTrip.findFirst.mockResolvedValue(null);
    prisma.taxiTrip.findMany.mockResolvedValue([taxiTrip]);
    prisma.taxiTrip.create.mockImplementation(async ({ data }: any) => ({
      ...taxiTrip,
      ...data,
      customer: taxiTrip.customer,
      driverProfile: null,
      events: []
    }));
    prisma.taxiTrip.update.mockImplementation(async ({ data }: any) => ({
      ...taxiTrip,
      ...data,
      driverProfile: data.driverProfile ? driverProfile : taxiTrip.driverProfile,
      status: data.status ?? taxiTrip.status,
      events: []
    }));
    prisma.taxiTrip.count.mockResolvedValue(1);
    prisma.taxiTripEvent.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prisma));
    audit.record.mockResolvedValue({});
    config.get.mockImplementation((_key: string, fallback?: unknown) => fallback);
  });

  it("creates a customer taxi waitlist entry with normalized Nigerian phone number", async () => {
    const result = await service.joinWaitlist({
      fullName: "Demo Customer",
      phoneNumber: "08030000001",
      email: "CUSTOMER@EXAMPLE.TEST",
      city: "Kano",
      state: "Kano",
      pickupArea: "Bompai"
    });

    expect(prisma.taxiWaitlistEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        phoneNumber: "+2348030000001",
        email: "customer@example.test"
      })
    }));
    expect(result).toMatchObject({ status: TaxiWaitlistStatus.SUBMITTED });
    expect(result.message).toContain("Taxi waitlist");
  });

  it("rejects invalid phone numbers before creating taxi readiness records", async () => {
    await expect(service.joinWaitlist({
      fullName: "Bad Phone",
      phoneNumber: "12345",
      city: "Kano",
      state: "Kano"
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiWaitlistEntry.create).not.toHaveBeenCalled();
  });

  it("submits a driver readiness application without activating taxi dispatch", async () => {
    const result = await service.submitDriverApplication({
      fullName: "Demo Driver",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      vehicleType: TaxiVehicleType.SEDAN,
      vehicleOwnership: TaxiVehicleOwnership.OWNER
    });

    expect(prisma.taxiDriverApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicationReference: expect.stringMatching(/^KGO-TAXI-\d{4}-/),
        phoneNumber: "+2348030000000",
        vehicleType: TaxiVehicleType.SEDAN
      })
    }));
    expect(result).toMatchObject({ readinessOnly: true, status: TaxiApplicationStatus.SUBMITTED });
  });

  it("returns latest public application status by phone number", async () => {
    await expect(service.publicApplicationStatus({ phoneNumber: "2348030000000" })).resolves.toMatchObject({
      applicationReference: application.applicationReference,
      readinessOnly: true
    });
    expect(prisma.taxiDriverApplication.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { phoneNumber: "+2348030000000" }
    }));
  });

  it("returns not found when no public application status exists", async () => {
    prisma.taxiDriverApplication.findFirst.mockResolvedValueOnce(null);
    await expect(service.publicApplicationStatus({ phoneNumber: "08030000000" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lets admins review driver applications with audit metadata", async () => {
    prisma.taxiDriverApplication.findUnique.mockResolvedValue(application);
    const result = await service.reviewDriverApplication(application.id, "admin-user", {
      status: TaxiApplicationStatus.UNDER_REVIEW,
      applicantVisibleNote: "We are reviewing your taxi readiness application.",
      adminNote: "Licence check pending."
    });

    expect(prisma.taxiDriverApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: application.id },
      data: expect.objectContaining({
        status: TaxiApplicationStatus.UNDER_REVIEW,
        reviewedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "admin.taxi.driver_application_review", "TaxiDriverApplication", application.id, expect.objectContaining({
      readinessOnly: true
    }));
    expect(result.launchWarning).toContain("does not activate live taxi dispatch");
  });

  it("updates waitlist status with audit trail only", async () => {
    const result = await service.updateWaitlistStatus(waitlistEntry.id, "admin-user", {
      status: TaxiWaitlistStatus.CONTACTED,
      note: "Called customer"
    });

    expect(prisma.taxiWaitlistEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: waitlistEntry.id },
      data: { status: TaxiWaitlistStatus.CONTACTED }
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "admin.taxi.waitlist_status_update", "TaxiWaitlistEntry", waitlistEntry.id, expect.objectContaining({
      status: TaxiWaitlistStatus.CONTACTED
    }));
    expect(result.status).toBe(TaxiWaitlistStatus.CONTACTED);
  });

  it("supports admin status filtering without exposing live dispatch actions", async () => {
    await service.listDriverApplications({ status: TaxiApplicationStatus.SUBMITTED });
    expect(prisma.taxiDriverApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: TaxiApplicationStatus.SUBMITTED },
      take: 150
    }));
  });

  it("blocks Taxi trip requests when staging dispatch flags are disabled", async () => {
    await expect(service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano"
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.taxiTrip.create).not.toHaveBeenCalled();
  });

  it("calculates staging fare estimates when Taxi staging is enabled", () => {
    enableTaxiStaging();
    const result = service.fareEstimate({
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano",
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18
    });

    expect(result).toMatchObject({
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      estimatedFareKobo: 304500,
      currency: "NGN"
    });
    expect(result.testModeNotice).toContain("staging test mode");
  });

  it("creates staging Taxi trips with a unique reference and hashed trip PIN", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValue(null);

    const result = await service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano",
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18
    });
    const createCall = prisma.taxiTrip.create.mock.calls[0][0];

    expect(createCall.data.tripReference).toMatch(/^KGO-TAXI-TRIP-2026-/);
    expect(result.tripPin).toMatch(/^\d{6}$/);
    expect(createCall.data.tripPinHash).not.toBe(result.tripPin);
    expect(createCall.data.tripPinLastFour).toBe(result.tripPin.slice(-4));
    expect(await bcrypt.compare(result.tripPin, createCall.data.tripPinHash)).toBe(true);
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: "taxi.trip.requested" })
    }));
  });

  it("allows an approved available Taxi test driver to accept a requested trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValue(taxiTrip);

    const result = await service.acceptTaxiTrip("rider-user", taxiTrip.id);

    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        driverProfile: { connect: { id: driverProfile.id } },
        status: TaxiTripStatus.ACCEPTED
      })
    }));
    expect(result.status).toBe(TaxiTripStatus.ACCEPTED);
  });

  it("blocks unapproved drivers from accepting Taxi test trips", async () => {
    enableTaxiStaging();
    prisma.taxiDriverProfile.findUnique.mockResolvedValueOnce({ ...driverProfile, status: TaxiDriverProfileStatus.PENDING_ACTIVATION });

    await expect(service.acceptTaxiTrip("rider-user", taxiTrip.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });

  it("rejects starting a Taxi test trip without the correct customer PIN", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce({
      ...taxiTrip,
      driverProfileId: driverProfile.id,
      driverProfile,
      status: TaxiTripStatus.ARRIVED_PICKUP,
      tripPinHash: await bcrypt.hash("123456", 10)
    });

    await expect(service.riderStartTrip("rider-user", taxiTrip.id, { tripPin: "000000" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });

  it("lets admins assign and cancel staging Taxi trips with audit records", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValueOnce(taxiTrip).mockResolvedValueOnce({ ...taxiTrip, status: TaxiTripStatus.DRIVER_ASSIGNED });

    await service.adminAssignDriver("admin-user", taxiTrip.id, { driverProfileId: driverProfile.id });
    await service.adminCancelTrip("admin-user", taxiTrip.id, { reason: "Staging drill complete" });

    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        driverProfile: { connect: { id: driverProfile.id } },
        status: TaxiTripStatus.DRIVER_ASSIGNED
      })
    }));
    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: TaxiTripStatus.CANCELLED_BY_ADMIN,
        cancellationReason: "Staging drill complete"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "admin.taxi.trip.driver_assigned", "TaxiTrip", taxiTrip.id, expect.objectContaining({
      stagingOnly: true
    }));
  });

  it("does not let customers access another customer's Taxi trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(null);

    await expect(service.customerTrip("customer-user", "other-trip-id")).rejects.toBeInstanceOf(NotFoundException);
  });
});
