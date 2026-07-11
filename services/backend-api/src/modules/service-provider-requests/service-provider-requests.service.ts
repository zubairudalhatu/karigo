import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceProviderRequestStatus, ServiceProviderType } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";
import { ListServiceProviderRequestsQueryDto } from "./dto/list-service-provider-requests-query.dto";
import { UpdateServiceProviderRequestStatusDto } from "./dto/update-service-provider-request-status.dto";

const SERVICE_CATALOGUE: Array<{
  type: ServiceProviderType;
  label: string;
  description: string;
  readinessOnly?: boolean;
  statusLabel?: string;
}> = [
  { type: ServiceProviderType.PAINTER, label: "Painter", description: "Painting and finishing support for homes, shops and offices." },
  { type: ServiceProviderType.PLUMBER, label: "Plumber", description: "Plumbing repairs, fittings and inspection requests." },
  { type: ServiceProviderType.MECHANIC, label: "Mechanic", description: "Vehicle inspection and mechanic visit requests." },
  { type: ServiceProviderType.ELECTRICIAN, label: "Electrician", description: "Electrical repairs, fittings and safety checks." },
  { type: ServiceProviderType.CLEANER, label: "Cleaner", description: "Cleaning service requests for homes, shops and offices." },
  { type: ServiceProviderType.CARPENTER, label: "Carpenter", description: "Furniture repair, fittings and light woodwork requests." },
  { type: ServiceProviderType.AC_TECHNICIAN, label: "AC technician", description: "AC inspection, servicing and repair requests." },
  { type: ServiceProviderType.GENERATOR_REPAIR, label: "Generator repair technician", description: "Generator inspection, servicing and repair requests." },
  {
    type: ServiceProviderType.HEALTH_PROFESSIONAL,
    label: "Doctor / health professional",
    description: "Health professional onboarding is readiness-only and requires future approval before live booking.",
    readinessOnly: true,
    statusLabel: "Future approval required"
  },
  { type: ServiceProviderType.OTHER, label: "Other approved service provider", description: "Describe another service need for KariGO review." }
];

@Injectable()
export class ServiceProviderRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  catalogue() {
    return SERVICE_CATALOGUE.map((item) => ({
      ...item,
      readinessOnly: !!item.readinessOnly,
      statusLabel: item.statusLabel ?? "Staging request"
    }));
  }

  async create(userId: string, dto: CreateServiceProviderRequestDto) {
    const category = SERVICE_CATALOGUE.find((item) => item.type === dto.serviceType);
    if (!category) {
      throw new BadRequestException("Unsupported SME Services category.");
    }
    if (category.readinessOnly) {
      throw new BadRequestException("Health professional booking is not live. KariGO is preparing compliance and approval checks before this category can be requested.");
    }

    const customer = await this.requireCustomer(userId);
    const serviceAddress = await this.prisma.address.findFirst({
      where: { id: dto.serviceAddressId, userId },
      select: { id: true }
    });
    if (!serviceAddress) {
      throw new NotFoundException("Service address not found");
    }

    const request = await this.prisma.serviceProviderRequest.create({
      data: {
        requestNumber: await this.uniqueRequestNumber(),
        customerId: customer.id,
        serviceType: dto.serviceType,
        serviceLabel: category.label,
        serviceAddressId: dto.serviceAddressId,
        description: dto.description.trim(),
        contactPhone: dto.contactPhone.trim(),
        preferredDate: dto.preferredDate?.trim() || undefined,
        preferredTimeWindow: dto.preferredTimeWindow?.trim() || undefined,
        customerNote: dto.customerNote?.trim() || undefined,
        readinessOnly: false
      },
      include: this.customerInclude()
    });
    return this.customerRequest(request);
  }

  async listMine(userId: string) {
    const customer = await this.requireCustomer(userId);
    const requests = await this.prisma.serviceProviderRequest.findMany({
      where: { customerId: customer.id },
      include: this.customerInclude(),
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return requests.map((request) => this.customerRequest(request, true));
  }

  async detail(userId: string, requestId: string) {
    const customer = await this.requireCustomer(userId);
    const request = await this.prisma.serviceProviderRequest.findFirst({
      where: { id: requestId, customerId: customer.id },
      include: this.customerInclude()
    });
    if (!request) {
      throw new NotFoundException("SME Services request not found");
    }
    return this.customerRequest(request);
  }

  async adminList(query: ListServiceProviderRequestsQueryDto) {
    const where: Prisma.ServiceProviderRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
      ...(query.search ? {
        OR: [
          { requestNumber: { contains: query.search, mode: "insensitive" as const } },
          { serviceLabel: { contains: query.search, mode: "insensitive" as const } },
          { description: { contains: query.search, mode: "insensitive" as const } },
          { contactPhone: { contains: query.search } },
          { customer: { user: { fullName: { contains: query.search, mode: "insensitive" as const } } } },
          { customer: { user: { phoneNumber: { contains: query.search } } } }
        ]
      } : {})
    };

    const [items, total, submitted, underReview, providerMatching, providerAssigned, completed, cancelled] = await Promise.all([
      this.prisma.serviceProviderRequest.findMany({
        where,
        include: this.adminInclude(),
        orderBy: { createdAt: "desc" },
        take: 200
      }),
      this.prisma.serviceProviderRequest.count({ where: {} }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.SUBMITTED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.UNDER_REVIEW } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.PROVIDER_MATCHING } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.COMPLETED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.CANCELLED } })
    ]);

    return {
      summary: { total, submitted, underReview, providerMatching, providerAssigned, completed, cancelled },
      items: items.map((request) => this.adminRequest(request, true))
    };
  }

  async adminDetail(requestId: string) {
    const request = await this.prisma.serviceProviderRequest.findUnique({
      where: { id: requestId },
      include: this.adminInclude()
    });
    if (!request) {
      throw new NotFoundException("SME Services request not found");
    }

    const reviewHistory = await this.prisma.adminAuditLog.findMany({
      where: { entityType: "ServiceProviderRequest", entityId: requestId },
      select: { id: true, action: true, newValue: true, createdAt: true, adminUser: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return {
      ...this.adminRequest(request),
      reviewHistory
    };
  }

  async adminUpdateStatus(adminUserId: string, requestId: string, dto: UpdateServiceProviderRequestStatusDto) {
    const existing = await this.prisma.serviceProviderRequest.findUnique({
      where: { id: requestId },
      include: this.adminInclude()
    });
    if (!existing) {
      throw new NotFoundException("SME Services request not found");
    }

    const updated = await this.prisma.serviceProviderRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        ...(dto.adminNote === undefined ? {} : { adminNote: dto.adminNote.trim() || null })
      },
      include: this.adminInclude()
    });

    await this.audit.record(adminUserId, "service_provider_request.status_changed", "ServiceProviderRequest", requestId, {
      previousStatus: existing.status,
      status: dto.status,
      serviceType: existing.serviceType,
      requestNumber: existing.requestNumber
    });

    return this.adminRequest(updated);
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }
    return customer;
  }

  private async uniqueRequestNumber() {
    for (let i = 0; i < 5; i += 1) {
      const requestNumber = `KGO-SVC-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
      const existing = await this.prisma.serviceProviderRequest.findUnique({ where: { requestNumber }, select: { id: true } });
      if (!existing) return requestNumber;
    }
    throw new BadRequestException("Could not generate a unique service request reference. Please try again.");
  }

  private customerInclude() {
    return {
      serviceAddress: {
        select: {
          id: true,
          label: true,
          addressLine: true,
          city: true,
          state: true,
          country: true
        }
      }
    };
  }

  private adminInclude() {
    return {
      customer: {
        select: {
          id: true,
          user: { select: { id: true, fullName: true, phoneNumber: true, email: true } }
        }
      },
      serviceAddress: {
        select: {
          id: true,
          label: true,
          addressLine: true,
          city: true,
          state: true,
          country: true
        }
      }
    };
  }

  private customerRequest(request: Prisma.ServiceProviderRequestGetPayload<{ include: ReturnType<ServiceProviderRequestsService["customerInclude"]> }>, list = false) {
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      serviceType: request.serviceType,
      serviceLabel: request.serviceLabel,
      description: list ? undefined : request.description,
      contactPhone: list ? undefined : request.contactPhone,
      preferredDate: request.preferredDate,
      preferredTimeWindow: request.preferredTimeWindow,
      customerNote: list ? undefined : request.customerNote,
      status: request.status,
      readinessOnly: request.readinessOnly,
      serviceAddress: request.serviceAddress,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }

  private adminRequest(request: Prisma.ServiceProviderRequestGetPayload<{ include: ReturnType<ServiceProviderRequestsService["adminInclude"]> }>, list = false) {
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      serviceType: request.serviceType,
      serviceLabel: request.serviceLabel,
      description: request.description,
      contactPhone: request.contactPhone,
      preferredDate: request.preferredDate,
      preferredTimeWindow: request.preferredTimeWindow,
      customerNote: request.customerNote,
      status: request.status,
      readinessOnly: request.readinessOnly,
      adminNote: list ? undefined : request.adminNote,
      customer: request.customer,
      serviceAddress: request.serviceAddress,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }
}
