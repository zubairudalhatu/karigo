import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TaxiApplicationStatus, TaxiVehicleOwnership, TaxiVehicleType, TaxiWaitlistStatus } from "@prisma/client";
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

describe("TaxiService", () => {
  const prisma = {
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
    }
  };
  const audit = { record: jest.fn() };
  const service = new TaxiService(prisma as unknown as PrismaService, audit as unknown as AdminAuditService);

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
    audit.record.mockResolvedValue({});
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
});
