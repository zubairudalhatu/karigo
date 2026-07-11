import { NotFoundException } from "@nestjs/common";
import { ServiceProviderRequestStatus, ServiceProviderType } from "@prisma/client";
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

  it("rejects admin detail for missing requests", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(null);
    await expect(service.adminDetail(request.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
