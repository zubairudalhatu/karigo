import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ServiceProviderApplicationStatus, ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ServiceProviderApplicationsService } from "./service-provider-applications.service";

const now = new Date("2026-07-11T12:00:00.000Z");
const application = {
  id: "00000000-0000-0000-0000-000000000901",
  applicationReference: "KGO-SPA-2026-ABC123",
  fullName: "Demo Plumber",
  businessName: "Demo Plumbing",
  serviceType: ServiceProviderType.PLUMBER,
  phoneNumber: "+2348011111111",
  email: "provider@karigo.local",
  city: "Kano",
  state: "Kano",
  serviceAreas: ["Nasarawa GRA", "Bompai"],
  address: "Nasarawa GRA, Kano",
  experienceSummary: "Five years of plumbing work",
  toolsOrEquipment: "Hand tools",
  availability: "Weekdays",
  identificationType: "National ID",
  identificationNumber: "NIN-REDACTED",
  status: ServiceProviderApplicationStatus.SUBMITTED,
  reviewNote: null,
  submittedAt: now,
  reviewedAt: null,
  createdAt: now,
  updatedAt: now,
  reviewedByAdmin: null,
  convertedProvider: null
};

describe("ServiceProviderApplicationsService", () => {
  const prisma = {
    serviceProviderApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    serviceProvider: {
      create: jest.fn(),
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new ServiceProviderApplicationsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue({});
    prisma.serviceProviderApplication.findUnique.mockResolvedValue(null);
    prisma.serviceProvider.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
  });

  it("creates a public application only after safety confirmations are accepted", async () => {
    prisma.serviceProviderApplication.create.mockResolvedValue(application);

    const result = await service.create({
      fullName: "Demo Plumber",
      businessName: "Demo Plumbing",
      serviceType: ServiceProviderType.PLUMBER,
      phoneNumber: "+2348011111111",
      email: "provider@karigo.local",
      city: "Kano",
      state: "Kano",
      serviceAreas: ["Nasarawa GRA"],
      detailsAccurateAccepted: true,
      reviewRequiredAccepted: true,
      noAutoDispatchAccepted: true
    });

    expect(prisma.serviceProviderApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fullName: "Demo Plumber",
        serviceType: ServiceProviderType.PLUMBER,
        status: ServiceProviderApplicationStatus.SUBMITTED
      })
    }));
    expect(result).toMatchObject({
      applicationReference: "KGO-SPA-2026-ABC123",
      status: ServiceProviderApplicationStatus.SUBMITTED
    });
    expect(result).not.toHaveProperty("identificationNumber");
  });

  it("rejects public applications without required safety confirmations", async () => {
    await expect(service.create({
      fullName: "Demo Plumber",
      serviceType: ServiceProviderType.PLUMBER,
      phoneNumber: "+2348011111111",
      city: "Kano",
      state: "Kano",
      detailsAccurateAccepted: true,
      reviewRequiredAccepted: false,
      noAutoDispatchAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns public status without private identification fields", async () => {
    prisma.serviceProviderApplication.findFirst.mockResolvedValue(application);

    const result = await service.publicStatus({ phoneNumber: "+2348011111111" });

    expect(prisma.serviceProviderApplication.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { phoneNumber: "+2348011111111" }
    }));
    expect(result).toMatchObject({ status: ServiceProviderApplicationStatus.SUBMITTED });
    expect(result).not.toHaveProperty("identificationNumber");
  });

  it("returns not found for unknown public application status lookups", async () => {
    prisma.serviceProviderApplication.findFirst.mockResolvedValue(null);
    await expect(service.publicStatus({ phoneNumber: "+2348011111111" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists applications for admins without identification numbers", async () => {
    prisma.serviceProviderApplication.findMany.mockResolvedValue([application]);

    const result = await service.adminList({
      status: ServiceProviderApplicationStatus.SUBMITTED,
      serviceType: ServiceProviderType.PLUMBER,
      city: "Kano",
      search: "Demo"
    });

    expect(prisma.serviceProviderApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: ServiceProviderApplicationStatus.SUBMITTED,
        serviceType: ServiceProviderType.PLUMBER,
        city: { contains: "Kano", mode: "insensitive" },
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result[0]).not.toHaveProperty("identificationNumber");
  });

  it("updates admin review status and records an audit entry", async () => {
    prisma.serviceProviderApplication.findUnique.mockResolvedValue(application);
    prisma.serviceProviderApplication.update.mockResolvedValue({
      ...application,
      status: ServiceProviderApplicationStatus.UNDER_REVIEW,
      reviewNote: "Calling applicant",
      reviewedAt: now
    });

    const result = await service.adminReview(application.id, "admin-user", {
      status: ServiceProviderApplicationStatus.UNDER_REVIEW,
      reviewNote: "Calling applicant"
    });

    expect(prisma.serviceProviderApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: application.id },
      data: expect.objectContaining({
        status: ServiceProviderApplicationStatus.UNDER_REVIEW,
        reviewNote: "Calling applicant",
        reviewedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_application.reviewed", "ServiceProviderApplication", application.id, expect.objectContaining({
      status: ServiceProviderApplicationStatus.UNDER_REVIEW
    }));
    expect(result.status).toBe(ServiceProviderApplicationStatus.UNDER_REVIEW);
  });

  it("blocks health professional approval and conversion", async () => {
    const healthApplication = { ...application, serviceType: ServiceProviderType.HEALTH_PROFESSIONAL };
    prisma.serviceProviderApplication.findUnique.mockResolvedValue(healthApplication);

    await expect(service.adminReview(application.id, "admin-user", {
      status: ServiceProviderApplicationStatus.APPROVED
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.approveCreateProvider(application.id, "admin-user", {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("converts an application to a pending provider record without dispatch, payment or payout activation", async () => {
    prisma.serviceProviderApplication.findUnique.mockResolvedValue(application);
    prisma.serviceProviderApplication.update.mockResolvedValue({
      ...application,
      status: ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER,
      reviewedAt: now,
      convertedProvider: {
        id: "00000000-0000-0000-0000-000000000902",
        providerCode: "KGO-SP-001",
        fullName: "Demo Plumber",
        serviceType: ServiceProviderType.PLUMBER,
        status: ServiceProviderStatus.PENDING_REVIEW,
        readinessOnly: false
      }
    });

    const result = await service.approveCreateProvider(application.id, "admin-user", {
      reviewNote: "Approved for onboarding review",
      providerNote: "Create internal record"
    });

    expect(prisma.serviceProvider.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceApplication: { connect: { id: application.id } },
        serviceType: ServiceProviderType.PLUMBER,
        status: ServiceProviderStatus.PENDING_REVIEW,
        readinessOnly: false
      })
    }));
    expect(prisma.serviceProviderApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER,
        reviewedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_application.converted", "ServiceProviderApplication", application.id, expect.objectContaining({
      providerStatus: ServiceProviderStatus.PENDING_REVIEW
    }));
    expect(result.convertedProvider?.providerCode).toBe("KGO-SP-001");
  });
});
