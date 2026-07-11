import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceProviderType } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";

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
  constructor(private readonly prisma: PrismaService) {}

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
}
