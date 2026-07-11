import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ServiceProviderRequestStatus, ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

const now = new Date("2026-07-11T12:00:00.000Z");
const request = {
  id: "00000000-0000-0000-0000-000000000701",
  requestNumber: "KGO-SVC-001",
  customerId: "customer-1",
  serviceType: ServiceProviderType.PLUMBER,
  serviceLabel: "Plumber",
  serviceAddressId: "address-1",
  description: "Fix leaking kitchen sink",
  contactPhone: "+2348011111111",
  preferredDate: "2026-07-12",
  preferredTimeWindow: "Morning",
  customerNote: "Call before arrival",
  status: ServiceProviderRequestStatus.SUBMITTED,
  readinessOnly: false,
  adminNote: null,
  createdAt: now,
  updatedAt: now,
  assignedProviderId: null,
  assignedByAdminId: null,
  assignmentNote: null,
  assignedAt: null,
  assignedProvider: null,
  assignedByAdmin: null,
  customer: {
    id: "customer-1",
    user: { id: "user-1", fullName: "Demo Customer", phoneNumber: "+2348011111111", email: "customer@karigo.local" }
  },
  serviceAddress: {
    id: "address-1",
    label: "Home",
    addressLine: "Nasarawa GRA",
    city: "Kano",
    state: "Kano",
    country: "Nigeria"
  }
};

const provider = {
  id: "00000000-0000-0000-0000-000000000801",
  providerCode: "KGO-SP-001",
  fullName: "Demo Plumber",
  businessName: "Demo Plumbing",
  serviceType: ServiceProviderType.PLUMBER,
  phoneNumber: "+2348022222222",
  email: "provider@karigo.local",
  city: "Kano",
  state: "Kano",
  serviceAreas: ["Nasarawa GRA", "Bompai"],
  status: ServiceProviderStatus.APPROVED,
  readinessOnly: false,
  notes: null,
  verificationNote: "ID checked",
  createdAt: now,
  updatedAt: now
};

describe("ServiceProviderRequestsService admin operations", () => {
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
    serviceProviderRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    serviceProvider: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    adminAuditLog: { findMany: jest.fn() }
  };
  const audit = { record: jest.fn() };
  const service = new ServiceProviderRequestsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue({});
  });

  it("lists SME Services requests with safe filters and summary counts", async () => {
    prisma.serviceProviderRequest.findMany.mockResolvedValue([request]);
    prisma.serviceProviderRequest.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.adminList({
      status: ServiceProviderRequestStatus.SUBMITTED,
      serviceType: ServiceProviderType.PLUMBER,
      search: "Demo"
    });

    expect(prisma.serviceProviderRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: ServiceProviderRequestStatus.SUBMITTED,
        serviceType: ServiceProviderType.PLUMBER,
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result.summary).toMatchObject({ total: 1, submitted: 1, underReview: 0 });
    expect(result.items[0]).toMatchObject({
      requestNumber: "KGO-SVC-001",
      serviceLabel: "Plumber",
      customer: request.customer
    });
  });

  it("returns admin detail with review history", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.adminAuditLog.findMany.mockResolvedValue([{ id: "audit-1", action: "service_provider_request.status_changed", createdAt: now }]);

    const result = await service.adminDetail(request.id);

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { entityType: "ServiceProviderRequest", entityId: request.id },
      take: 20
    }));
    expect(result.reviewHistory).toHaveLength(1);
  });

  it("updates admin status without creating dispatch, payment or provider assignment records", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProviderRequest.update.mockResolvedValue({ ...request, status: ServiceProviderRequestStatus.UNDER_REVIEW, adminNote: "Call customer" });

    const result = await service.adminUpdateStatus("admin-user", request.id, {
      status: ServiceProviderRequestStatus.UNDER_REVIEW,
      adminNote: "Call customer"
    });

    expect(prisma.serviceProviderRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id },
      data: { status: ServiceProviderRequestStatus.UNDER_REVIEW, adminNote: "Call customer" }
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_request.status_changed", "ServiceProviderRequest", request.id, {
      previousStatus: ServiceProviderRequestStatus.SUBMITTED,
      status: ServiceProviderRequestStatus.UNDER_REVIEW,
      serviceType: ServiceProviderType.PLUMBER,
      requestNumber: "KGO-SVC-001"
    });
    expect(result.status).toBe(ServiceProviderRequestStatus.UNDER_REVIEW);
  });

  it("lists SME Services providers with safe filters and summary counts", async () => {
    prisma.serviceProvider.findMany.mockResolvedValue([provider]);
    prisma.serviceProvider.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.adminListProviders({
      status: ServiceProviderStatus.APPROVED,
      serviceType: ServiceProviderType.PLUMBER,
      city: "Kano",
      search: "Demo"
    });

    expect(prisma.serviceProvider.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: ServiceProviderStatus.APPROVED,
        serviceType: ServiceProviderType.PLUMBER,
        city: { contains: "Kano", mode: "insensitive" },
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result.summary).toMatchObject({ total: 1, approved: 1 });
    expect(result.items[0]).toMatchObject({ providerCode: "KGO-SP-001", fullName: "Demo Plumber" });
  });

  it("creates provider records without provider login, payout or dispatch records", async () => {
    prisma.serviceProvider.findUnique.mockResolvedValue(null);
    prisma.serviceProvider.create.mockResolvedValue(provider);

    const result = await service.adminCreateProvider("admin-user", {
      fullName: "Demo Plumber",
      businessName: "Demo Plumbing",
      serviceType: ServiceProviderType.PLUMBER,
      phoneNumber: "+2348022222222",
      email: "provider@karigo.local",
      city: "Kano",
      state: "Kano",
      serviceAreas: ["Nasarawa GRA"],
      status: ServiceProviderStatus.APPROVED,
      verificationNote: "ID checked"
    });

    expect(prisma.serviceProvider.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fullName: "Demo Plumber",
        serviceType: ServiceProviderType.PLUMBER,
        status: ServiceProviderStatus.APPROVED
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider.created", "ServiceProvider", provider.id, expect.objectContaining({
      providerCode: provider.providerCode
    }));
    expect(result.providerCode).toBe("KGO-SP-001");
  });

  it("blocks approved health professional provider records", async () => {
    await expect(service.adminCreateProvider("admin-user", {
      fullName: "Demo Doctor",
      serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
      phoneNumber: "+2348033333333",
      city: "Kano",
      state: "Kano",
      status: ServiceProviderStatus.APPROVED
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("manually assigns only an approved matching provider and records review status", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProvider.findUnique.mockResolvedValue(provider);
    prisma.serviceProviderRequest.update.mockResolvedValue({
      ...request,
      status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED,
      assignedProviderId: provider.id,
      assignedByAdminId: "admin-user",
      assignmentNote: "Manual call confirmed",
      assignedAt: now,
      assignedProvider: provider,
      assignedByAdmin: { id: "admin-user", fullName: "Ops Admin", email: "admin@karigo.local" }
    });

    const result = await service.adminAssignProvider("admin-user", request.id, {
      providerId: provider.id,
      assignmentNote: "Manual call confirmed"
    });

    expect(prisma.serviceProviderRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id },
      data: expect.objectContaining({
        assignedProviderId: provider.id,
        assignedByAdminId: "admin-user",
        assignmentNote: "Manual call confirmed",
        status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_request.provider_assigned", "ServiceProviderRequest", request.id, expect.objectContaining({
      providerCode: provider.providerCode,
      status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED
    }));
    expect(result.assignedProvider?.providerCode).toBe("KGO-SP-001");
    expect(result.status).toBe(ServiceProviderRequestStatus.PROVIDER_ASSIGNED);
  });

  it("rejects manual assignment for mismatched provider service type", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProvider.findUnique.mockResolvedValue({ ...provider, serviceType: ServiceProviderType.ELECTRICIAN });

    await expect(service.adminAssignProvider("admin-user", request.id, {
      providerId: provider.id
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects admin detail for missing requests", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(null);
    await expect(service.adminDetail(request.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
