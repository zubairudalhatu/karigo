import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AccountStatus, DocumentVerificationStatus, Prisma, TaxiApplicationStatus, TaxiDriverProfileStatus, TaxiTripStatus, TaxiVehicleOwnership, TaxiVehicleType, TaxiWaitlistStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CaptainUploadStorageService } from "../riders/captain-upload-storage.service";
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
  residentialStateCode: "KANO",
  residentialCityCode: "KANO",
  operatingAreaIds: ["kano-kano"],
  primaryOperatingAreaId: "kano-kano",
  address: "Nasarawa GRA",
  driverLicenceNumber: "DL-123",
  driverLicenceDocumentUrl: "https://docs.example.test/licence.jpg",
  driverLicenceExpiry: null,
  vehicleMake: "Toyota",
  vehicleModel: "Corolla",
  vehicleYear: 2015,
  vehicleColour: "Black",
  vehicleCustomMake: null,
  vehicleCustomModel: null,
  vehicleCustomColour: null,
  vehiclePlateNumber: "KGO-123AA",
  vehicleType: TaxiVehicleType.SEDAN,
  vehicleOwnership: TaxiVehicleOwnership.OWNER,
  vehicleParticularsDocumentUrl: "https://docs.example.test/particulars.pdf",
  insuranceDocumentUrl: null,
  notes: "Ready for review",
  status: TaxiApplicationStatus.SUBMITTED,
  adminNote: null,
  applicantVisibleNote: null,
  reviewedByAdminId: null,
  reviewedAt: null,
  createdAt: now,
  updatedAt: now,
  applicant: null,
  reviewedByAdmin: null,
  captainDocuments: []
};

const rideDocument = (id: string, documentType: string) => ({
  id,
  userId: "customer-user",
  deliveryApplicationId: null,
  rideApplicationId: null,
  documentType,
  objectKey: `captain-applications/customer-user/${documentType.toLowerCase()}.jpg`,
  originalFileName: `${documentType.toLowerCase()}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 120000,
  uploadStatus: "UPLOADED",
  reviewStatus: "PENDING",
  adminNote: null,
  applicantVisibleNote: null,
  uploadedAt: now,
  reviewedAt: null,
  reviewedByAdminId: null,
  replacedAt: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now
});

const requiredRideDocuments = [
  rideDocument("doc-profile", "PROFILE_PHOTO"),
  rideDocument("doc-licence", "DRIVER_LICENCE"),
  rideDocument("doc-exterior", "VEHICLE_EXTERIOR"),
  rideDocument("doc-interior", "VEHICLE_INTERIOR"),
  rideDocument("doc-vehicle-licence", "VEHICLE_LICENCE")
];

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
  status: TaxiDriverProfileStatus.ACTIVE,
  isAvailableForTaxi: true,
  lastKnownLatitude: new Prisma.Decimal("12.0022"),
  lastKnownLongitude: new Prisma.Decimal("8.5920"),
  lastSeenAt: now,
  createdAt: now,
  updatedAt: now,
  application,
  user: {
    id: "rider-user",
    accountStatus: AccountStatus.ACTIVE,
    phoneVerified: true,
    deletedAt: null,
    captainWorkState: {
      activeWorkMode: null,
      desiredRideOnline: true
    }
  }
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
  tripPinEncrypted: null,
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
      findUniqueOrThrow: jest.fn(),
      update: jest.fn()
    },
    captainApplicationDocument: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
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
      findUniqueOrThrow: jest.fn(),
      update: jest.fn()
    },
    taxiTripEvent: {
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma))
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };
  const captainUploadStorage = {
    signedViewUrl: jest.fn()
  };
  const applicationNotifications = {
    rideWaitlistJoined: jest.fn(),
    rideCaptainApplicationSubmitted: jest.fn()
  };
  const captainWorkState = {
    updateAvailability: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    transitionLock: jest.fn()
  };
  const service = new TaxiService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService,
    config as never,
    captainUploadStorage as unknown as CaptainUploadStorageService,
    applicationNotifications as unknown as ApplicationNotificationsService,
    captainWorkState as unknown as CaptainWorkStateService
  );

  function enableTaxiStaging() {
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        RIDES_SERVICE_ENABLED: true,
        RIDES_PRODUCTION_ENABLED: true,
        RIDES_DISPATCH_MODE: "MANUAL",
        RIDES_CONTROLLED_PILOT_ENABLED: false,
        RIDES_AUTO_DISPATCH_ENABLED: false,
        RIDES_PAYMENT_ENABLED: false,
        TAXI_SERVICE_ENABLED: true,
        TAXI_STAGING_DISPATCH_ENABLED: false,
        RIDES_ACTIVE_SERVICE_AREAS: "Abuja,Kano",
        RIDES_ASSIGNMENT_ACCEPTANCE_SECONDS: 45,
        RIDES_CAPTAIN_LOCATION_STALE_SECONDS: 90,
        RIDES_REQUEST_EXPIRY_MINUTES: 10,
        RIDE_PER_KM_KOBO: 40000,
        RIDE_CAPTAIN_COMMISSION_PERCENT: 10,
        RIDE_WAITING_CHARGE_KOBO_PER_MINUTE: 500,
        RIDE_WAITING_GRACE_MINUTES: 5
      };
      return values[key] ?? fallback;
    });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: "rider-user",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.PENDING,
      phoneNumber: "+2348030000000",
      phoneVerified: true,
      passwordHash: "hashed-password",
      onboardingPasswordSetAt: now,
      deletedAt: null
    });
    prisma.user.update.mockResolvedValue({});
    prisma.taxiDriverApplication.findUnique.mockResolvedValue(null);
    prisma.taxiDriverApplication.create.mockResolvedValue(application);
    prisma.taxiDriverApplication.findUniqueOrThrow.mockResolvedValue(application);
    prisma.taxiDriverApplication.findFirst.mockImplementation(async ({ where }: any) =>
      where?.OR ? null : application
    );
    prisma.taxiDriverApplication.findMany.mockResolvedValue([application]);
    prisma.taxiDriverApplication.update.mockResolvedValue({ ...application, status: TaxiApplicationStatus.UNDER_REVIEW, reviewedAt: now });
    prisma.captainApplicationDocument.findMany.mockResolvedValue([]);
    prisma.captainApplicationDocument.updateMany.mockResolvedValue({ count: 0 });
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
    prisma.taxiTrip.findUniqueOrThrow.mockResolvedValue(taxiTrip);
    prisma.taxiTrip.findFirst.mockResolvedValue(null);
    prisma.taxiTrip.findMany.mockResolvedValue([]);
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
    applicationNotifications.rideWaitlistJoined.mockResolvedValue(undefined);
    applicationNotifications.rideCaptainApplicationSubmitted.mockResolvedValue(undefined);
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
    expect(applicationNotifications.rideWaitlistJoined).toHaveBeenCalledWith({
      reference: waitlistEntry.id,
      recipientName: waitlistEntry.fullName,
      phoneNumber: waitlistEntry.phoneNumber,
      email: waitlistEntry.email
    });
    expect(result).toMatchObject({ status: TaxiWaitlistStatus.SUBMITTED });
    expect(result.message).toContain("KariGO Rides waitlist");
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
      address: "Nasarawa GRA",
      driverLicenceNumber: "DL-123",
      driverLicenceDocumentUrl: "https://docs.example.test/licence.jpg",
      driverLicenceExpiry: "2028-12-31",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: 2015,
      vehicleColour: "Black",
      vehiclePlateNumber: "KGO-123AA",
      vehicleType: TaxiVehicleType.SEDAN,
      vehicleOwnership: TaxiVehicleOwnership.OWNER,
      vehicleParticularsDocumentUrl: "https://docs.example.test/particulars.pdf"
    });

    expect(prisma.taxiDriverApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicationReference: expect.stringMatching(/^KGO-TAXI-\d{4}-/),
        phoneNumber: "+2348030000000",
        vehicleType: TaxiVehicleType.SEDAN
      })
    }));
    expect(applicationNotifications.rideCaptainApplicationSubmitted).toHaveBeenCalledWith({
      reference: application.applicationReference,
      recipientName: application.fullName,
      phoneNumber: application.phoneNumber,
      email: application.email
    });
    expect(result).toMatchObject({ readinessOnly: true, status: TaxiApplicationStatus.SUBMITTED });
  });

  it("links an existing verified Customer account to a Ride Captain readiness application", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348030000000",
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      passwordHash: "customer-password-hash",
      onboardingPasswordSetAt: null,
      deletedAt: null
    });
    prisma.taxiDriverApplication.create.mockResolvedValueOnce({
      ...application,
      applicantUserId: "customer-user",
      applicant: {
        id: "customer-user",
        role: UserRole.CUSTOMER,
        phoneNumber: "+2348030000000",
        accountStatus: AccountStatus.ACTIVE,
        deletedAt: null,
        phoneVerified: true,
        passwordHash: "customer-password-hash",
        onboardingPasswordSetAt: null,
        rider: null
      }
    });
    prisma.taxiDriverApplication.findUniqueOrThrow.mockResolvedValueOnce({
      ...application,
      applicantUserId: "customer-user",
      applicant: {
        id: "customer-user",
        role: UserRole.CUSTOMER,
        phoneNumber: "+2348030000000",
        accountStatus: AccountStatus.ACTIVE,
        deletedAt: null,
        phoneVerified: true,
        passwordHash: "customer-password-hash",
        onboardingPasswordSetAt: null,
        rider: null
      }
    });
    prisma.captainApplicationDocument.findMany.mockResolvedValueOnce(requiredRideDocuments);

    const result = await service.submitDriverApplication({
      fullName: "Existing Customer",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      residentialStateCode: "KANO",
      residentialCityCode: "KANO",
      operatingAreaIds: ["kano-kano"],
      primaryOperatingAreaId: "kano-kano",
      address: "Nasarawa GRA",
      driverLicenceNumber: "DL-123",
      driverLicenceDocumentUrl: "https://docs.example.test/licence.jpg",
      driverLicenceExpiry: "2028-12-31",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: 2015,
      vehicleColour: "Black",
      vehiclePlateNumber: "KGO-123AA",
      vehicleType: TaxiVehicleType.SEDAN,
      vehicleOwnership: TaxiVehicleOwnership.OWNER,
      vehicleParticularsDocumentUrl: "https://docs.example.test/particulars.pdf",
      documentIds: requiredRideDocuments.map((document) => document.id)
    }, "customer-user");

    expect(prisma.taxiDriverApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ applicantUserId: "customer-user" })
    }));
    expect(result).toMatchObject({ readinessOnly: true, status: TaxiApplicationStatus.SUBMITTED });
  });

  it("returns an existing active Ride Captain readiness application instead of creating a duplicate", async () => {
    prisma.taxiDriverApplication.findFirst.mockResolvedValueOnce(application);

    const result = await service.submitDriverApplication({
      fullName: "Demo Driver",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      address: "Nasarawa GRA",
      driverLicenceNumber: "DL-123",
      driverLicenceDocumentUrl: "https://docs.example.test/licence.jpg",
      driverLicenceExpiry: "2028-12-31",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: 2015,
      vehicleColour: "Black",
      vehiclePlateNumber: "KGO-123AA",
      vehicleType: TaxiVehicleType.SEDAN,
      vehicleOwnership: TaxiVehicleOwnership.OWNER,
      vehicleParticularsDocumentUrl: "https://docs.example.test/particulars.pdf"
    });

    expect(prisma.taxiDriverApplication.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ applicationReference: application.applicationReference, status: TaxiApplicationStatus.SUBMITTED });
  });

  it("returns latest public application status by phone number", async () => {
    await expect(service.publicApplicationStatus({ phoneNumber: "2348030000000" })).resolves.toMatchObject({
      applicationReference: application.applicationReference,
      readinessOnly: true
    });
    expect(prisma.taxiDriverApplication.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ phoneNumber: "+2348030000000", trashedAt: null })
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
      applicantVisibleNote: "We are reviewing your Ride Captain application.",
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
    expect(result.launchWarning).toContain("Ride operations remain managed by KariGO Operations");
  });

  it("blocks Ride Captain approval when required secure documents are pending", async () => {
    prisma.taxiDriverApplication.findUnique.mockResolvedValueOnce({
      ...application,
      captainDocuments: requiredRideDocuments
    });

    await expect(service.reviewDriverApplication(application.id, "admin-user", {
      status: TaxiApplicationStatus.APPROVED
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.taxiDriverApplication.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiApplicationStatus.APPROVED })
    }));
  });

  it("reviews Ride Captain secure documents and records an audit event", async () => {
    const document = {
      ...requiredRideDocuments[0],
      rideApplicationId: application.id,
      reviewStatus: DocumentVerificationStatus.PENDING
    };
    prisma.captainApplicationDocument.findFirst.mockResolvedValueOnce(document);
    prisma.captainApplicationDocument.update.mockResolvedValueOnce({
      ...document,
      reviewStatus: DocumentVerificationStatus.APPROVED,
      reviewedByAdminId: "admin-user",
      reviewedAt: now
    });

    await expect(service.reviewRideCaptainApplicationDocument("admin-user", application.id, document.id, {
      status: DocumentVerificationStatus.APPROVED
    })).resolves.toMatchObject({ reviewStatus: DocumentVerificationStatus.APPROVED });

    expect(audit.record).toHaveBeenCalledWith("admin-user", "CAPTAIN_DOCUMENT_APPROVED", "CaptainApplicationDocument", document.id, expect.objectContaining({
      mode: "RIDE_CAPTAIN",
      previousStatus: DocumentVerificationStatus.PENDING,
      newStatus: DocumentVerificationStatus.APPROVED
    }));
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
      where: expect.objectContaining({ status: TaxiApplicationStatus.SUBMITTED, trashedAt: null }),
      take: 150
    }));
  });

  it("blocks Ride trip requests when production Ride flags are disabled", async () => {
    await expect(service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano"
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.taxiTrip.create).not.toHaveBeenCalled();
  });

  it("calculates Ride fare estimates with distance, waiting charge and commission defaults", () => {
    enableTaxiStaging();
    const result = service.fareEstimate({
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano",
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      waitingMinutes: 8
    });

    expect(result).toMatchObject({
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      waitingMinutes: 8,
      billableWaitingMinutes: 3,
      distanceFareKobo: 260000,
      waitingChargeKobo: 1500,
      estimatedFareKobo: 261500,
      karigoCommissionKobo: 26150,
      captainNetEstimateKobo: 235350,
      currency: "NGN",
      formula: {
        perKmKobo: 40000,
        waitingChargeKoboPerMinute: 500,
        waitingGraceMinutes: 5,
        karigoCommissionPercent: 10,
        vatTaxKobo: 0,
        vatTaxConfigured: false
      }
    });
    expect(result.launchNotice).toContain("KariGO Rides is live");
  });

  it("returns ride categories and applies the selected category multiplier to fare estimates", () => {
    enableTaxiStaging();

    const categories = service.rideCategories("Kano");
    const result = service.fareEstimate({
      pickupAddress: "Tarauni, Kano",
      destinationAddress: "Zoo Road, Kano",
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      waitingMinutes: 8,
      rideCategory: "COMFORT"
    });

    expect(categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "ECONOMY", name: "KariGO Economy" }),
      expect.objectContaining({ id: "COMFORT", name: "KariGO Comfort" })
    ]));
    expect(result.selectedRideCategory).toMatchObject({ id: "COMFORT", name: "KariGO Comfort" });
    expect(result.estimatedFareKobo).toBe(326875);
    expect(result.rideCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "ECONOMY",
        fareEstimateKobo: 261500
      }),
      expect.objectContaining({
        id: "COMFORT",
        fareEstimateKobo: 326875
      })
    ]));
  });

  it("rejects cross-city Ride fare estimates", () => {
    enableTaxiStaging();
    expect(() => service.fareEstimate({
      pickupAddress: "Gwarinpa, Abuja",
      pickupLatitude: 9.0765,
      pickupLongitude: 7.3986,
      destinationAddress: "Tarauni, Kano",
      destinationLatitude: 12.0022,
      destinationLongitude: 8.592,
      estimatedDistanceKm: 420,
      estimatedDurationMin: 360
    })).toThrow(BadRequestException);
  });

  it("creates production Ride trips with a unique reference and protected trip PIN", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValue(null);

    const result = await service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      pickupLatitude: 12.0022,
      pickupLongitude: 8.592,
      destinationAddress: "Zoo Road, Kano",
      destinationLatitude: 12.014,
      destinationLongitude: 8.541,
      stopAddress: "Bompai, Kano",
      stopLatitude: 12.019,
      stopLongitude: 8.56,
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      rideCategory: "COMFORT",
      paymentMethod: "CASH_ON_DELIVERY",
      scheduledPickupAt: "2026-07-28T09:30:00.000Z",
      pickupInstruction: "Meet at the main gate"
    });
    const createCall = prisma.taxiTrip.create.mock.calls[0][0];

    expect(createCall.data.tripReference).toMatch(/^KGO-TAXI-TRIP-2026-/);
    expect(createCall.data.customerNote).toContain("Ride category: COMFORT");
    expect(createCall.data.customerNote).toContain("Stop: Bompai, Kano");
    expect(createCall.data.customerNote).toContain("Payment preference: CASH_ON_DELIVERY");
    expect(createCall.data.customerNote).toContain("Pickup instruction: Meet at the main gate");
    expect((result as { tripPin?: string }).tripPin).toBeUndefined();
    expect(createCall.data.tripPinHash).toBeTruthy();
    expect(createCall.data.tripPinEncrypted).toMatch(/^v1:/);
    expect(createCall.data.tripPinLastFour).toMatch(/^\d{4}$/);
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "taxi.trip.requested",
        metadata: expect.objectContaining({
          rideCategory: "COMFORT",
          paymentMethod: "CASH_ON_DELIVERY",
          scheduledPickupAt: "2026-07-28T09:30:00.000Z"
        })
      })
    }));
  });

  it("rejects a second active immediate Ride request while a REQUESTED trip exists", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(taxiTrip);

    await expect(service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      pickupLatitude: 12.0022,
      pickupLongitude: 8.592,
      destinationAddress: "Zoo Road, Kano",
      destinationLatitude: 12.014,
      destinationLongitude: 8.541,
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      rideCategory: "ECONOMY",
      clientRequestId: "client-attempt-1"
    })).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.taxiTrip.create).not.toHaveBeenCalled();
  });

  it("reveals the protected pickup PIN only to the owning customer at ARRIVED_PICKUP", async () => {
    enableTaxiStaging();
    await service.createCustomerTrip("customer-user", {
      pickupAddress: "Tarauni, Kano",
      pickupLatitude: 12.0022,
      pickupLongitude: 8.592,
      destinationAddress: "Zoo Road, Kano",
      destinationLatitude: 12.014,
      destinationLongitude: 8.541,
      estimatedDistanceKm: 6.5,
      estimatedDurationMin: 18,
      rideCategory: "ECONOMY"
    });
    const createCall = prisma.taxiTrip.create.mock.calls[0][0];
    prisma.taxiTrip.findFirst.mockResolvedValueOnce({
      ...taxiTrip,
      status: TaxiTripStatus.ARRIVED_PICKUP,
      driverProfileId: driverProfile.id,
      driverProfile,
      tripPinHash: createCall.data.tripPinHash,
      tripPinEncrypted: createCall.data.tripPinEncrypted
    });

    const result = await service.customerTrip("customer-user", taxiTrip.id);

    expect(result.tripPin).toMatch(/^\d{6}$/);
    expect(await bcrypt.compare(result.tripPin!, createCall.data.tripPinHash)).toBe(true);
    expect(result.captain).toMatchObject({ displayName: driverProfile.fullName, verified: true });
    expect(result.vehicle).toMatchObject({ registrationNumber: driverProfile.vehiclePlateNumber });
  });

  it("does not expose false Captain data when an assigned Ride has no Captain relation", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce({
      ...taxiTrip,
      status: TaxiTripStatus.DRIVER_ASSIGNED,
      driverProfileId: driverProfile.id,
      driverProfile: null
    });

    const result = await service.customerTrip("customer-user", taxiTrip.id);

    expect(result.assignmentIncomplete).toBe(true);
    expect(result.captain).toBeNull();
    expect(result.vehicle).toBeNull();
    expect(result.tripPin).toBeUndefined();
  });

  it("returns safe active trip details in duplicate Ride conflict responses", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(taxiTrip);

    try {
      await service.createCustomerTrip("customer-user", {
        pickupAddress: "Tarauni, Kano",
        pickupLatitude: 12.0022,
        pickupLongitude: 8.592,
        destinationAddress: "Zoo Road, Kano",
        destinationLatitude: 12.014,
        destinationLongitude: 8.541,
        estimatedDistanceKm: 6.5,
        estimatedDurationMin: 18,
        rideCategory: "ECONOMY"
      });
      throw new Error("Expected duplicate Ride conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      const response = (error as ConflictException).getResponse() as { message: string; error_code: string; details: { activeTrip: typeof taxiTrip } };
      expect(response.error_code).toBe("ACTIVE_RIDE_EXISTS");
      expect(response.message).toContain("You already have an active KariGO Ride");
      expect(response.details.activeTrip).toMatchObject({
        id: taxiTrip.id,
        tripReference: taxiTrip.tripReference,
        status: TaxiTripStatus.REQUESTED
      });
      expect((response.details.activeTrip as { tripPin?: string }).tripPin).toBeUndefined();
    }
  });

  it("rejects cross-city Ride trip creation before creating a trip", async () => {
    enableTaxiStaging();
    await expect(service.createCustomerTrip("customer-user", {
      pickupAddress: "Gwarinpa, Abuja",
      pickupLatitude: 9.0765,
      pickupLongitude: 7.3986,
      destinationAddress: "Tarauni, Kano",
      destinationLatitude: 12.0022,
      destinationLongitude: 8.592,
      estimatedDistanceKm: 420,
      estimatedDurationMin: 360,
      rideCategory: "ECONOMY"
    })).rejects.toThrow(BadRequestException);
    expect(prisma.taxiTrip.create).not.toHaveBeenCalled();
  });

  it("returns only manually assigned active ride trips to approved available Captains", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
      { ...taxiTrip, driverProfileId: driverProfile.id, driverProfile, status: TaxiTripStatus.DRIVER_ASSIGNED }
      ]);

    const result = await service.availableTaxiTrips("rider-user");

    expect(prisma.taxiTrip.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        driverProfileId: driverProfile.id,
        status: { in: expect.arrayContaining([TaxiTripStatus.DRIVER_ASSIGNED, TaxiTripStatus.ACCEPTED]) }
      })
    }));
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(TaxiTripStatus.DRIVER_ASSIGNED);
  });

  it("allows an approved available Ride Captain to accept a manually assigned trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValue({ ...taxiTrip, driverProfileId: driverProfile.id, status: TaxiTripStatus.DRIVER_ASSIGNED });

    const result = await service.acceptTaxiTrip("rider-user", taxiTrip.id);

    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: TaxiTripStatus.ACCEPTED
      })
    }));
    expect(result.status).toBe(TaxiTripStatus.ACCEPTED);
  });

  it("blocks Captains from self-claiming unassigned ride requests", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValue(taxiTrip);

    await expect(service.acceptTaxiTrip("rider-user", taxiTrip.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });

  it("blocks unapproved Captains from accepting Ride trips", async () => {
    enableTaxiStaging();
    prisma.taxiDriverProfile.findUnique.mockResolvedValueOnce({ ...driverProfile, status: TaxiDriverProfileStatus.PENDING_ACTIVATION });

    await expect(service.acceptTaxiTrip("rider-user", taxiTrip.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });

  it("rejects starting a Ride trip without the correct customer PIN", async () => {
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

  it("lets admins assign and cancel production Ride trips with audit records", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findUnique.mockResolvedValueOnce(taxiTrip).mockResolvedValueOnce({ ...taxiTrip, status: TaxiTripStatus.DRIVER_ASSIGNED });
    prisma.taxiDriverProfile.findUnique.mockResolvedValueOnce({ ...driverProfile, lastSeenAt: new Date() });

    await service.adminAssignDriver("admin-user", taxiTrip.id, { driverProfileId: driverProfile.id });
    await service.adminCancelTrip("admin-user", taxiTrip.id, { reason: "Operations drill complete" });

    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        driverProfile: { connect: { id: driverProfile.id } },
        status: TaxiTripStatus.DRIVER_ASSIGNED
      })
    }));
    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: TaxiTripStatus.CANCELLED_BY_ADMIN,
        cancellationReason: "Operations drill complete"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "admin.taxi.trip.driver_assigned", "TaxiTrip", taxiTrip.id, expect.objectContaining({
      productionMode: true
    }));
  });

  it("does not let customers access another customer's Taxi trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(null);

    await expect(service.customerTrip("customer-user", "other-trip-id")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cancels only the selected owned active Ride trip", async () => {
    enableTaxiStaging();
    const selectedTrip = { ...taxiTrip, id: "00000000-0000-0000-0000-00000000e002", tripReference: "KGO-TAXI-TRIP-2026-SELECTED" };
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(selectedTrip);

    await service.customerCancelTrip("customer-user", selectedTrip.id, { reason: "Changed pickup plan" });

    expect(prisma.taxiTrip.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: selectedTrip.id },
      data: expect.objectContaining({
        status: TaxiTripStatus.CANCELLED_BY_CUSTOMER,
        cancellationReason: "Changed pickup plan",
        tripPinHash: null
      })
    }));
  });

  it("keeps customer cancellation idempotent for an already cancelled selected trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce({
      ...taxiTrip,
      status: TaxiTripStatus.CANCELLED_BY_CUSTOMER,
      cancelledAt: now,
      tripPinHash: null,
      cancellationReason: "Changed pickup plan"
    });

    const result = await service.customerCancelTrip("customer-user", taxiTrip.id, { reason: "Changed pickup plan" });

    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
    expect(result.status).toBe(TaxiTripStatus.CANCELLED_BY_CUSTOMER);
    expect((result as { tripPin?: string }).tripPin).toBeUndefined();
  });

  it("rejects customer cancellation after the pickup lifecycle point", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce({
      ...taxiTrip,
      status: TaxiTripStatus.ARRIVED_PICKUP
    });

    await expect(service.customerCancelTrip("customer-user", taxiTrip.id, { reason: "Too late" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });

  it("rejects customer cancellation for another customer's Ride trip", async () => {
    enableTaxiStaging();
    prisma.taxiTrip.findFirst.mockResolvedValueOnce(null);

    await expect(service.customerCancelTrip("customer-user", taxiTrip.id, { reason: "Not mine" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.taxiTrip.update).not.toHaveBeenCalled();
  });
});
