import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountStatus, DeliveryCaptainApplicationStatus, DeliveryCaptainVehicleType, RiderStatus, TaxiApplicationStatus, TaxiDriverProfileStatus, UserRole } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CaptainUploadStorageService } from "./captain-upload-storage.service";
import { RidersService } from "./riders.service";

const now = new Date("2026-07-13T10:00:00.000Z");

const deliveryCaptainApplication = {
  id: "00000000-0000-0000-0000-00000000c001",
  applicationReference: "KGO-CAPTAIN-2026-ABC123",
  fullName: "Demo Captain",
  phoneNumber: "+2348030000000",
  email: "captain@example.test",
  city: "Kano",
  state: "Kano",
  address: "Tarauni, Kano",
  preferredZone: "Tarauni",
  residentialStateCode: "KANO",
  residentialCityCode: "KANO",
  operatingAreaIds: ["kano-kano"],
  primaryOperatingAreaId: "kano-kano",
  vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
  vehiclePlateNumber: "KGO-123AA",
  driverLicenceNumber: "DRV-123456",
  riderExperience: "Two years delivery experience",
  profilePhotoUrl: null,
  guarantorName: "Demo Guarantor",
  guarantorPhone: "+2348030000001",
  notes: null,
  status: DeliveryCaptainApplicationStatus.SUBMITTED,
  adminNote: null,
  applicantVisibleNote: null,
  reviewedAt: null,
  applicantUserId: "00000000-0000-0000-0000-00000000caaa",
  applicant: {
    id: "00000000-0000-0000-0000-00000000caaa",
    fullName: "Demo Captain",
    phoneNumber: "+2348030000000",
    email: "captain@example.test",
    role: UserRole.RIDER,
    accountStatus: AccountStatus.PENDING,
    phoneVerified: true,
    onboardingPasswordSetAt: now,
    deletedAt: null,
    rider: null
  },
  documents: [],
  captainDocuments: [],
  createdAt: now,
  updatedAt: now
};

const uploadedProfilePhoto = {
  id: "00000000-0000-0000-0000-00000000d001",
  userId: deliveryCaptainApplication.applicantUserId,
  deliveryApplicationId: null,
  rideApplicationId: null,
  documentType: "PROFILE_PHOTO",
  objectKey: "captain-applications/user/profile-photo.jpg",
  originalFileName: "profile-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 120000,
  uploadStatus: "UPLOADED",
  reviewStatus: "PENDING",
  adminNote: null,
  uploadedAt: now,
  reviewedAt: null,
  reviewedByAdminId: null,
  replacedAt: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now
};

describe("RidersService delivery captain applications", () => {
  const prisma: any = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    rider: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    taxiDriverApplication: {
      findFirst: jest.fn()
    },
    taxiDriverProfile: {
      findUnique: jest.fn()
    },
    deliveryCaptainApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn()
    },
    captainApplicationDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    }
  };
  const captainUploadStorage = {
    putObject: jest.fn(),
    signedViewUrl: jest.fn()
  };
  const applicationNotifications = {
    deliveryCaptainApplicationSubmitted: jest.fn(),
    deliveryCaptainGuarantorListed: jest.fn(),
    deliveryCaptainApplicationReviewed: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new RidersService(
    prisma as unknown as PrismaService,
    captainUploadStorage as unknown as CaptainUploadStorageService,
    applicationNotifications as unknown as ApplicationNotificationsService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      deliveryCaptainApplication: {
        create: prisma.deliveryCaptainApplication.create,
        findUniqueOrThrow: prisma.deliveryCaptainApplication.findUniqueOrThrow,
        update: prisma.deliveryCaptainApplication.update
      },
      captainApplicationDocument: prisma.captainApplicationDocument,
      user: prisma.user,
      rider: prisma.rider,
      riderDocument: { createMany: jest.fn() }
    }));
    prisma.user.findUnique.mockResolvedValue(deliveryCaptainApplication.applicant);
    prisma.rider.findUnique.mockResolvedValue(null);
    prisma.taxiDriverApplication.findFirst.mockResolvedValue(null);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(null);
    prisma.deliveryCaptainApplication.findUnique.mockImplementation(async ({ where }: any) =>
      where.applicationReference ? null : deliveryCaptainApplication
    );
    prisma.deliveryCaptainApplication.create.mockResolvedValue(deliveryCaptainApplication);
    prisma.deliveryCaptainApplication.findUniqueOrThrow.mockResolvedValue(deliveryCaptainApplication);
    prisma.deliveryCaptainApplication.findFirst.mockImplementation(async ({ where }: any) =>
      where?.phoneNumber ? deliveryCaptainApplication : null
    );
    prisma.deliveryCaptainApplication.findMany.mockResolvedValue([deliveryCaptainApplication]);
    prisma.deliveryCaptainApplication.update.mockResolvedValue({ ...deliveryCaptainApplication, status: DeliveryCaptainApplicationStatus.UNDER_REVIEW, reviewedAt: now });
    prisma.captainApplicationDocument.findMany.mockResolvedValue([]);
    applicationNotifications.deliveryCaptainApplicationSubmitted.mockResolvedValue(undefined);
    applicationNotifications.deliveryCaptainGuarantorListed.mockResolvedValue(undefined);
    applicationNotifications.deliveryCaptainApplicationReviewed.mockResolvedValue(undefined);
    audit.record.mockResolvedValue({});
  });

  it("creates a Kano or Abuja account-linked Delivery Captain application without activating dispatch or payouts", async () => {
    const result = await service.createDeliveryCaptainApplication({
      fullName: "Demo Captain",
      phoneNumber: "08030000000",
      email: "CAPTAIN@EXAMPLE.TEST",
      city: "Kano",
      state: "Kano",
      address: "Tarauni, Kano",
      preferredZone: "Tarauni",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      vehiclePlateNumber: "KGO-123AA",
      riderExperience: "Two years delivery experience",
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    });

    expect(prisma.deliveryCaptainApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicationReference: expect.stringMatching(/^KGO-CAPTAIN-\d{4}-/),
        applicant: { connect: { id: deliveryCaptainApplication.applicantUserId } },
        phoneNumber: "+2348030000000",
        guarantorPhone: "+2348030000001",
        email: "captain@example.test",
        city: "Kano",
        state: "Kano"
      })
    }));
    expect(result).toMatchObject({
      deliveryOnly: true,
      pilotCity: "Kano",
      launchCities: ["Kano", "Abuja"],
      createsLogin: true,
      activatesDispatch: false,
      payoutActivation: false
    });
    expect(applicationNotifications.deliveryCaptainApplicationSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      reference: deliveryCaptainApplication.applicationReference,
      phoneNumber: deliveryCaptainApplication.phoneNumber
    }));
    expect(applicationNotifications.deliveryCaptainGuarantorListed).toHaveBeenCalledWith(expect.objectContaining({
      reference: deliveryCaptainApplication.applicationReference,
      guarantorPhone: deliveryCaptainApplication.guarantorPhone
    }));

    prisma.deliveryCaptainApplication.create.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      city: "Abuja",
      state: "FCT"
    });
    prisma.deliveryCaptainApplication.findUniqueOrThrow.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      city: "Abuja",
      state: "FCT",
      residentialStateCode: "FCT",
      residentialCityCode: "ABUJA",
      operatingAreaIds: ["fct-abuja"],
      primaryOperatingAreaId: "fct-abuja"
    });

    await expect(service.createDeliveryCaptainApplication({
      fullName: "Demo Abuja Captain",
      phoneNumber: "08030000000",
      city: "Abuja",
      state: "FCT",
      address: "Wuse, Abuja",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    })).resolves.toMatchObject({ pilotCity: "Abuja", launchCities: ["Kano", "Abuja"] });
  });

  it("links an existing verified Customer account to a Delivery Captain application", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      ...deliveryCaptainApplication.applicant,
      id: "customer-user",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      onboardingPasswordSetAt: null
    });
    prisma.deliveryCaptainApplication.create.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      applicantUserId: "customer-user",
      applicant: {
        ...deliveryCaptainApplication.applicant,
        id: "customer-user",
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        onboardingPasswordSetAt: null
      }
    });
    prisma.deliveryCaptainApplication.findUniqueOrThrow.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      applicantUserId: "customer-user",
      applicant: {
        ...deliveryCaptainApplication.applicant,
        id: "customer-user",
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        onboardingPasswordSetAt: null
      }
    });
    prisma.captainApplicationDocument.findMany.mockResolvedValueOnce([
      { ...uploadedProfilePhoto, id: "doc-profile", userId: "customer-user" }
    ]);

    const result = await service.createDeliveryCaptainApplicationForUser("customer-user", {
      fullName: "Existing Customer",
      phoneNumber: "08030000000",
      email: "customer@example.test",
      city: "Kano",
      state: "Kano",
      residentialStateCode: "KANO",
      residentialCityCode: "KANO",
      operatingAreaIds: ["kano-kano"],
      primaryOperatingAreaId: "kano-kano",
      address: "Tarauni, Kano",
      preferredZone: "Tarauni",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true,
      documentIds: ["doc-profile"]
    });

    expect(prisma.deliveryCaptainApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ applicant: { connect: { id: "customer-user" } } })
    }));
    expect(result).toMatchObject({
      createsLogin: true,
      applicationAccountRole: UserRole.CUSTOMER,
      activatesDispatch: false
    });
  });

  it("returns the existing active Delivery Captain application instead of creating a duplicate", async () => {
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce(deliveryCaptainApplication);

    const result = await service.createDeliveryCaptainApplication({
      fullName: "Demo Captain",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      address: "Tarauni, Kano",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    });

    expect(prisma.deliveryCaptainApplication.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      applicationReference: deliveryCaptainApplication.applicationReference,
      status: DeliveryCaptainApplicationStatus.SUBMITTED
    });
  });

  it("creates an approved rider profile when Admin approves a linked Customer application", async () => {
    const customerApplication = {
      ...deliveryCaptainApplication,
      applicant: {
        ...deliveryCaptainApplication.applicant,
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        onboardingPasswordSetAt: null
      }
    };
    prisma.deliveryCaptainApplication.findUnique.mockResolvedValueOnce(customerApplication);
    prisma.deliveryCaptainApplication.update.mockResolvedValueOnce({
      ...customerApplication,
      status: DeliveryCaptainApplicationStatus.APPROVED,
      reviewedAt: now
    });

    await service.reviewDeliveryCaptainApplication("admin-user", deliveryCaptainApplication.id, {
      status: DeliveryCaptainApplicationStatus.APPROVED
    });

    expect(prisma.rider.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: deliveryCaptainApplication.applicantUserId,
        verificationStatus: RiderStatus.ACTIVE
      })
    }));
  });

  it("returns not-yet-applied status for a signed-in Customer without a Captain application", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      deletedAt: null
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce(null);

    await expect(service.currentUserDeliveryCaptainApplicationStatus("customer-user")).resolves.toMatchObject({
      exists: false,
      nextStep: "SUBMIT_APPLICATION",
      message: "You are signed in with your KariGO account. Complete your Captain application to start onboarding."
    });
  });

  it("resolves an existing Customer account to Captain onboarding without operational access", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      profilePhotoUrl: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce(null);

    await expect(service.resolveCaptainAccess("customer-user")).resolves.toMatchObject({
      account: {
        id: "customer-user",
        role: UserRole.CUSTOMER,
        phoneNumber: "+2348030000000"
      },
      deliveryCaptainApplication: {
        exists: false,
        nextStep: "SUBMIT_APPLICATION"
      },
      rideCaptainApplication: {
        exists: false,
        nextStep: "SUBMIT_APPLICATION"
      },
      operationalModes: [],
      nextStep: "START_APPLICATION",
      nextRoute: "/auth/apply"
    });
    expect(prisma.rider.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "customer-user" }
    }));
  });

  it("resolves a pending Customer-linked application without calling it approved", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      profilePhotoUrl: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      applicantUserId: "customer-user",
      applicant: {
        ...deliveryCaptainApplication.applicant,
        id: "customer-user",
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE
      }
    });
    prisma.taxiDriverApplication.findFirst.mockResolvedValueOnce({
      id: "ride-app-1",
      applicationReference: "KGO-TAXI-2026-ABC123",
      applicantUserId: "customer-user",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      city: "Kano",
      state: "Kano",
      status: TaxiApplicationStatus.SUBMITTED,
      applicantVisibleNote: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    });

    await expect(service.resolveCaptainAccess("customer-user")).resolves.toMatchObject({
      deliveryCaptainApplication: {
        exists: true,
        applicationReference: deliveryCaptainApplication.applicationReference,
        status: DeliveryCaptainApplicationStatus.SUBMITTED
      },
      rideCaptainApplication: {
        exists: true,
        status: TaxiApplicationStatus.SUBMITTED
      },
      operationalModes: [],
      nextStep: "APPLICATION_STATUS",
      nextRoute: "/tabs/dashboard"
    });
  });

  it("resolves approved Delivery and Ride Captain operational profiles safely", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "rider-user",
      fullName: "Approved Captain",
      phoneNumber: "+2348030000000",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      profilePhotoUrl: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });
    prisma.rider.findUnique.mockResolvedValueOnce({
      id: "rider-profile-1",
      riderCode: "KGO-CAP-123",
      verificationStatus: RiderStatus.ACTIVE,
      availabilityStatus: RiderStatus.OFFLINE,
      totalDeliveries: 8,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      status: DeliveryCaptainApplicationStatus.APPROVED
    });
    prisma.taxiDriverProfile.findUnique.mockResolvedValueOnce({
      id: "ride-profile-1",
      userId: "rider-user",
      applicationId: "ride-app-1",
      fullName: "Approved Captain",
      phoneNumber: "+2348030000000",
      city: "Kano",
      state: "Kano",
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: 2018,
      vehicleColour: "Black",
      vehiclePlateNumber: "KGO-123AA",
      vehicleType: "SEDAN",
      status: TaxiDriverProfileStatus.ACTIVE_TEST,
      isAvailableForTaxi: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now
    });

    await expect(service.resolveCaptainAccess("rider-user")).resolves.toMatchObject({
      deliveryCaptainProfile: {
        riderCode: "KGO-CAP-123",
        operationalAccess: true
      },
      rideCaptainProfile: {
        id: "ride-profile-1",
        operationalAccess: true
      },
      operationalModes: ["DELIVERY_CAPTAIN", "RIDE_CAPTAIN"],
      nextStep: "OPEN_DASHBOARD",
      nextRoute: "/tabs/dashboard"
    });
  });

  it("rejects Delivery Captain applications outside approved launch city pairs", async () => {
    await expect(service.createDeliveryCaptainApplication({
      fullName: "Out of scope Captain",
      phoneNumber: "08030000000",
      city: "Kaduna",
      state: "Kaduna",
      address: "Outside Kano",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createDeliveryCaptainApplication({
      fullName: "Mismatched Captain",
      phoneNumber: "08030000000",
      city: "Abuja",
      state: "Kano",
      address: "Outside FCT",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deliveryCaptainApplication.create).not.toHaveBeenCalled();
  });

  it("requires declarations before creating a Delivery Captain application", async () => {
    await expect(service.createDeliveryCaptainApplication({
      fullName: "Demo Captain",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      address: "Tarauni, Kano",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: false,
      contactConsentAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deliveryCaptainApplication.create).not.toHaveBeenCalled();
  });

  it("returns the latest Delivery Captain public status by normalized phone number", async () => {
    await expect(service.deliveryCaptainApplicationStatus({ phoneNumber: "2348030000000" })).resolves.toMatchObject({
      applicationReference: deliveryCaptainApplication.applicationReference,
      status: DeliveryCaptainApplicationStatus.SUBMITTED,
      deliveryOnly: true
    });
    expect(prisma.deliveryCaptainApplication.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { phoneNumber: "+2348030000000" }
    }));
  });

  it("returns not found when no Delivery Captain public status exists", async () => {
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce(null);
    await expect(service.deliveryCaptainApplicationStatus({ phoneNumber: "08030000000" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists and reviews Delivery Captain applications for Admin with linked account readiness", async () => {
    await expect(service.listDeliveryCaptainApplications({ status: DeliveryCaptainApplicationStatus.SUBMITTED })).resolves.toEqual([
      expect.objectContaining({
        id: deliveryCaptainApplication.id,
        deliveryOnly: true,
        applicantAccount: expect.objectContaining({
          phoneVerified: true,
          passwordCreated: true
        }),
        launchWarning: expect.stringContaining("Approval activates the linked Captain account")
      })
    ]);
    expect(prisma.deliveryCaptainApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: DeliveryCaptainApplicationStatus.SUBMITTED },
      take: 150
    }));

    prisma.deliveryCaptainApplication.update.mockResolvedValueOnce({
      ...deliveryCaptainApplication,
      status: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
      applicantVisibleNote: "We are reviewing your application.",
      adminNote: "Verify guarantor.",
      reviewedAt: now
    });

    await expect(service.reviewDeliveryCaptainApplication("admin-user", deliveryCaptainApplication.id, {
      status: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
      applicantVisibleNote: "We are reviewing your application.",
      adminNote: "Verify guarantor."
    })).resolves.toMatchObject({
      status: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
      deliveryOnly: true
    });
    expect(prisma.deliveryCaptainApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: deliveryCaptainApplication.id },
      data: expect.objectContaining({
        status: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
        applicantVisibleNote: "We are reviewing your application.",
        adminNote: "Verify guarantor."
      })
    }));
    expect(applicationNotifications.deliveryCaptainApplicationReviewed).toHaveBeenCalledWith({
      reference: deliveryCaptainApplication.applicationReference,
      recipientName: deliveryCaptainApplication.fullName,
      phoneNumber: deliveryCaptainApplication.phoneNumber,
      email: deliveryCaptainApplication.email,
      status: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
      note: "We are reviewing your application."
    });
    expect(audit.record).toHaveBeenCalledWith("admin-user", "admin.delivery_captain_application.reviewed", "DeliveryCaptainApplication", deliveryCaptainApplication.id, expect.objectContaining({
      previousStatus: DeliveryCaptainApplicationStatus.SUBMITTED,
      newStatus: DeliveryCaptainApplicationStatus.UNDER_REVIEW,
      hasApplicantVisibleNote: true,
      hasAdminNote: true
    }));
  });
});
