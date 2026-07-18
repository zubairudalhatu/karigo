import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountStatus, DeliveryCaptainApplicationStatus, DeliveryCaptainVehicleType, UserRole } from "@prisma/client";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
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
    deliveryCaptainApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };
  const applicationNotifications = {
    deliveryCaptainApplicationSubmitted: jest.fn(),
    deliveryCaptainGuarantorListed: jest.fn(),
    deliveryCaptainApplicationReviewed: jest.fn()
  };
  const service = new RidersService(prisma as unknown as PrismaService, applicationNotifications as unknown as ApplicationNotificationsService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      deliveryCaptainApplication: { update: prisma.deliveryCaptainApplication.update },
      user: prisma.user,
      rider: prisma.rider,
      riderDocument: { createMany: jest.fn() }
    }));
    prisma.user.findUnique.mockResolvedValue(deliveryCaptainApplication.applicant);
    prisma.deliveryCaptainApplication.findUnique.mockImplementation(async ({ where }: any) =>
      where.applicationReference ? null : deliveryCaptainApplication
    );
    prisma.deliveryCaptainApplication.create.mockResolvedValue(deliveryCaptainApplication);
    prisma.deliveryCaptainApplication.findFirst.mockImplementation(async ({ where }: any) =>
      where?.OR ? null : deliveryCaptainApplication
    );
    prisma.deliveryCaptainApplication.findMany.mockResolvedValue([deliveryCaptainApplication]);
    prisma.deliveryCaptainApplication.update.mockResolvedValue({ ...deliveryCaptainApplication, status: DeliveryCaptainApplicationStatus.UNDER_REVIEW, reviewedAt: now });
    applicationNotifications.deliveryCaptainApplicationSubmitted.mockResolvedValue(undefined);
    applicationNotifications.deliveryCaptainGuarantorListed.mockResolvedValue(undefined);
    applicationNotifications.deliveryCaptainApplicationReviewed.mockResolvedValue(undefined);
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

    await expect(service.reviewDeliveryCaptainApplication(deliveryCaptainApplication.id, {
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
  });
});
