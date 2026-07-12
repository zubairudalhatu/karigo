import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceProviderApplicationStatus, ServiceProviderRequestStatus, ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignServiceProviderDto } from "./dto/assign-service-provider.dto";
import { CreateServiceProviderDto } from "./dto/create-service-provider.dto";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";
import { ListServiceProvidersQueryDto } from "./dto/list-service-providers-query.dto";
import { ListServiceProviderRequestsQueryDto } from "./dto/list-service-provider-requests-query.dto";
import { UpdateServiceProviderDto } from "./dto/update-service-provider.dto";
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

  async adminSummary() {
    const [
      totalRequests,
      submittedRequests,
      underReviewRequests,
      providerMatchingRequests,
      providerAssignedRequests,
      completedRequests,
      cancelledRequests,
      readinessOnlyRequests,
      totalApplications,
      submittedApplications,
      underReviewApplications,
      changesRequestedApplications,
      approvedApplications,
      rejectedApplications,
      convertedApplications,
      healthProfessionalApplications,
      totalProviders,
      pendingReviewProviders,
      approvedProviders,
      suspendedProviders,
      inactiveProviders,
      readinessOnlyProviders,
      recentRequests,
      recentApplications,
      recentProviders
    ] = await Promise.all([
      this.prisma.serviceProviderRequest.count(),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.SUBMITTED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.UNDER_REVIEW } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.PROVIDER_MATCHING } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.COMPLETED } }),
      this.prisma.serviceProviderRequest.count({ where: { status: ServiceProviderRequestStatus.CANCELLED } }),
      this.prisma.serviceProviderRequest.count({ where: { readinessOnly: true } }),
      this.prisma.serviceProviderApplication.count(),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.SUBMITTED } }),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.UNDER_REVIEW } }),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.CHANGES_REQUESTED } }),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.APPROVED } }),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.REJECTED } }),
      this.prisma.serviceProviderApplication.count({ where: { status: ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER } }),
      this.prisma.serviceProviderApplication.count({ where: { serviceType: ServiceProviderType.HEALTH_PROFESSIONAL } }),
      this.prisma.serviceProvider.count(),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.PENDING_REVIEW } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.APPROVED } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.SUSPENDED } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.INACTIVE } }),
      this.prisma.serviceProvider.count({ where: { readinessOnly: true } }),
      this.prisma.serviceProviderRequest.findMany({
        select: {
          id: true,
          requestNumber: true,
          serviceLabel: true,
          serviceType: true,
          status: true,
          readinessOnly: true,
          createdAt: true,
          updatedAt: true,
          customer: { select: { user: { select: { fullName: true } } } }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      this.prisma.serviceProviderApplication.findMany({
        select: {
          id: true,
          applicationReference: true,
          fullName: true,
          businessName: true,
          serviceType: true,
          status: true,
          submittedAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      this.prisma.serviceProvider.findMany({
        select: {
          id: true,
          providerCode: true,
          fullName: true,
          businessName: true,
          serviceType: true,
          status: true,
          readinessOnly: true,
          city: true,
          state: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      })
    ]);

    const activeRequests = submittedRequests + underReviewRequests + providerMatchingRequests + providerAssignedRequests;
    const pendingApplications = submittedApplications + underReviewApplications + changesRequestedApplications;

    return {
      requests: {
        total: totalRequests,
        active: activeRequests,
        submitted: submittedRequests,
        underReview: underReviewRequests,
        providerMatching: providerMatchingRequests,
        providerAssigned: providerAssignedRequests,
        completed: completedRequests,
        cancelled: cancelledRequests,
        readinessOnly: readinessOnlyRequests
      },
      providerApplications: {
        total: totalApplications,
        pending: pendingApplications,
        submitted: submittedApplications,
        underReview: underReviewApplications,
        changesRequested: changesRequestedApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        convertedToProvider: convertedApplications,
        healthProfessionalReadiness: healthProfessionalApplications
      },
      providers: {
        total: totalProviders,
        pendingReview: pendingReviewProviders,
        approved: approvedProviders,
        suspended: suspendedProviders,
        inactive: inactiveProviders,
        readinessOnly: readinessOnlyProviders
      },
      recent: {
        requests: recentRequests.map((request) => ({
          id: request.id,
          reference: request.requestNumber,
          title: request.serviceLabel,
          serviceType: request.serviceType,
          status: request.status,
          readinessOnly: request.readinessOnly,
          customerName: request.customer.user.fullName,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        })),
        applications: recentApplications.map((application) => ({
          id: application.id,
          reference: application.applicationReference,
          title: application.fullName,
          businessName: application.businessName,
          serviceType: application.serviceType,
          status: application.status,
          submittedAt: application.submittedAt,
          updatedAt: application.updatedAt
        })),
        providers: recentProviders.map((provider) => ({
          id: provider.id,
          reference: provider.providerCode,
          title: provider.fullName,
          businessName: provider.businessName,
          serviceType: provider.serviceType,
          status: provider.status,
          readinessOnly: provider.readinessOnly,
          city: provider.city,
          state: provider.state,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt
        }))
      },
      guardrails: {
        liveDispatchEnabled: false,
        livePaymentsEnabled: false,
        providerLoginEnabled: false,
        providerPayoutEnabled: false,
        medicalBookingEnabled: false,
        note: "SME Services remains an internal review and manual coordination workflow only."
      }
    };
  }

  async adminReport() {
    const generatedAt = new Date();
    const summary = await this.adminSummary();
    const stamp = generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const filename = `karigo-sme-services-pilot-report-${stamp}.md`;
    const requestLines = summary.recent.requests.length
      ? summary.recent.requests.map((request) => `| ${request.reference} | ${request.title} | ${request.status} | ${request.customerName} | ${this.reportDate(request.updatedAt)} |`).join("\n")
      : "| - | No recent SME Services requests | - | - | - |";
    const applicationLines = summary.recent.applications.length
      ? summary.recent.applications.map((application) => `| ${application.reference} | ${application.title} | ${application.serviceType} | ${application.status} | ${this.reportDate(application.updatedAt)} |`).join("\n")
      : "| - | No recent provider applications | - | - | - |";
    const providerLines = summary.recent.providers.length
      ? summary.recent.providers.map((provider) => `| ${provider.reference} | ${provider.title} | ${provider.serviceType} | ${provider.status} | ${provider.city}, ${provider.state} |`).join("\n")
      : "| - | No recent provider records | - | - | - |";

    const markdown = [
      "# KariGO SME Services Pilot Operations Report",
      "",
      `Generated: ${this.reportDate(generatedAt)}`,
      "",
      "## Executive Summary",
      "",
      `- Total customer requests: ${summary.requests.total}`,
      `- Active customer requests: ${summary.requests.active}`,
      `- Provider matching or assigned requests: ${summary.requests.providerMatching + summary.requests.providerAssigned}`,
      `- Completed requests: ${summary.requests.completed}`,
      `- Cancelled requests: ${summary.requests.cancelled}`,
      `- Pending provider applications: ${summary.providerApplications.pending}`,
      `- Approved provider records: ${summary.providers.approved}`,
      `- Readiness-only providers: ${summary.providers.readinessOnly}`,
      "",
      "## Request Status",
      "",
      `- Submitted: ${summary.requests.submitted}`,
      `- Under review: ${summary.requests.underReview}`,
      `- Provider matching: ${summary.requests.providerMatching}`,
      `- Provider assigned: ${summary.requests.providerAssigned}`,
      `- Completed: ${summary.requests.completed}`,
      `- Cancelled: ${summary.requests.cancelled}`,
      "",
      "## Provider Application Status",
      "",
      `- Submitted: ${summary.providerApplications.submitted}`,
      `- Under review: ${summary.providerApplications.underReview}`,
      `- Changes requested: ${summary.providerApplications.changesRequested}`,
      `- Approved: ${summary.providerApplications.approved}`,
      `- Converted to provider: ${summary.providerApplications.convertedToProvider}`,
      `- Rejected: ${summary.providerApplications.rejected}`,
      `- Health professional readiness records: ${summary.providerApplications.healthProfessionalReadiness}`,
      "",
      "## Provider Directory Status",
      "",
      `- Total providers: ${summary.providers.total}`,
      `- Pending review: ${summary.providers.pendingReview}`,
      `- Approved: ${summary.providers.approved}`,
      `- Suspended: ${summary.providers.suspended}`,
      `- Inactive: ${summary.providers.inactive}`,
      `- Readiness-only: ${summary.providers.readinessOnly}`,
      "",
      "## Recent Customer Requests",
      "",
      "| Reference | Service | Status | Customer | Updated |",
      "| --- | --- | --- | --- | --- |",
      requestLines,
      "",
      "## Recent Provider Applications",
      "",
      "| Reference | Applicant | Service type | Status | Updated |",
      "| --- | --- | --- | --- | --- |",
      applicationLines,
      "",
      "## Recent Provider Records",
      "",
      "| Reference | Provider | Service type | Status | Location |",
      "| --- | --- | --- | --- | --- |",
      providerLines,
      "",
      "## Operational Guardrails",
      "",
      `- Live dispatch: ${summary.guardrails.liveDispatchEnabled ? "Enabled" : "Disabled"}`,
      `- Live payments: ${summary.guardrails.livePaymentsEnabled ? "Enabled" : "Disabled"}`,
      `- Provider login: ${summary.guardrails.providerLoginEnabled ? "Enabled" : "Disabled"}`,
      `- Provider payout: ${summary.guardrails.providerPayoutEnabled ? "Enabled" : "Disabled"}`,
      `- Medical booking: ${summary.guardrails.medicalBookingEnabled ? "Enabled" : "Disabled"}`,
      `- Note: ${summary.guardrails.note}`,
      "",
      "## Management Notes",
      "",
      "- This report is for internal pilot monitoring and management review only.",
      "- It does not expose customer phone numbers, provider phone numbers, provider emails, payment data, OTPs or private admin notes.",
      "- SME Services remains a manual review and coordination workflow until management approves future live operations."
    ].join("\n");

    return {
      title: "KariGO SME Services Pilot Operations Report",
      generatedAt,
      filename,
      format: "markdown",
      mimeType: "text/markdown",
      summary,
      markdown
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
        ...(dto.adminNote === undefined ? {} : { adminNote: this.optionalText(dto.adminNote) }),
        ...(dto.customerNote === undefined ? {} : { customerUpdateNote: this.optionalText(dto.customerNote) })
      },
      include: this.adminInclude()
    });

    await this.audit.record(adminUserId, "service_provider_request.status_changed", "ServiceProviderRequest", requestId, {
      previousStatus: existing.status,
      status: dto.status,
      serviceType: existing.serviceType,
      requestNumber: existing.requestNumber,
      customerUpdateNoteProvided: dto.customerNote !== undefined
    });

    return this.adminRequest(updated);
  }

  async adminListProviders(query: ListServiceProvidersQueryDto) {
    const where: Prisma.ServiceProviderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
      ...(query.city ? { city: { contains: query.city.trim(), mode: "insensitive" as const } } : {}),
      ...(query.search ? {
        OR: [
          { providerCode: { contains: query.search, mode: "insensitive" as const } },
          { fullName: { contains: query.search, mode: "insensitive" as const } },
          { businessName: { contains: query.search, mode: "insensitive" as const } },
          { phoneNumber: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total, pendingReview, approved, suspended, inactive] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200
      }),
      this.prisma.serviceProvider.count({ where: {} }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.PENDING_REVIEW } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.APPROVED } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.SUSPENDED } }),
      this.prisma.serviceProvider.count({ where: { status: ServiceProviderStatus.INACTIVE } })
    ]);

    return {
      summary: { total, pendingReview, approved, suspended, inactive },
      items: items.map((provider) => this.adminProvider(provider))
    };
  }

  async adminCreateProvider(adminUserId: string, dto: CreateServiceProviderDto) {
    const readinessOnly = this.providerReadinessOnly(dto.serviceType, dto.readinessOnly);
    this.assertProviderCanUseStatus(dto.serviceType, readinessOnly, dto.status);

    const provider = await this.prisma.serviceProvider.create({
      data: {
        providerCode: await this.uniqueProviderCode(),
        fullName: dto.fullName.trim(),
        businessName: this.optionalText(dto.businessName),
        serviceType: dto.serviceType,
        phoneNumber: dto.phoneNumber.trim(),
        email: this.optionalText(dto.email),
        city: dto.city.trim(),
        state: dto.state.trim(),
        serviceAreas: this.serviceAreas(dto.serviceAreas),
        status: dto.status ?? ServiceProviderStatus.PENDING_REVIEW,
        readinessOnly,
        notes: this.optionalText(dto.notes),
        verificationNote: this.optionalText(dto.verificationNote)
      }
    });

    await this.audit.record(adminUserId, "service_provider.created", "ServiceProvider", provider.id, {
      providerCode: provider.providerCode,
      serviceType: provider.serviceType,
      status: provider.status
    });

    return this.adminProvider(provider);
  }

  async adminProviderDetail(providerId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException("SME Services provider not found");
    }
    return this.adminProvider(provider);
  }

  async adminUpdateProvider(adminUserId: string, providerId: string, dto: UpdateServiceProviderDto) {
    const existing = await this.prisma.serviceProvider.findUnique({ where: { id: providerId } });
    if (!existing) {
      throw new NotFoundException("SME Services provider not found");
    }

    const nextServiceType = dto.serviceType ?? existing.serviceType;
    const nextReadinessOnly = this.providerReadinessOnly(nextServiceType, dto.readinessOnly ?? existing.readinessOnly);
    const nextStatus = dto.status ?? existing.status;
    this.assertProviderCanUseStatus(nextServiceType, nextReadinessOnly, nextStatus);

    const provider = await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        ...(dto.fullName === undefined ? {} : { fullName: dto.fullName.trim() }),
        ...(dto.businessName === undefined ? {} : { businessName: this.optionalText(dto.businessName) }),
        ...(dto.serviceType === undefined ? {} : { serviceType: dto.serviceType }),
        ...(dto.phoneNumber === undefined ? {} : { phoneNumber: dto.phoneNumber.trim() }),
        ...(dto.email === undefined ? {} : { email: this.optionalText(dto.email) }),
        ...(dto.city === undefined ? {} : { city: dto.city.trim() }),
        ...(dto.state === undefined ? {} : { state: dto.state.trim() }),
        ...(dto.serviceAreas === undefined ? {} : { serviceAreas: this.serviceAreas(dto.serviceAreas) }),
        ...(dto.status === undefined ? {} : { status: dto.status }),
        ...(dto.readinessOnly === undefined ? {} : { readinessOnly: dto.readinessOnly }),
        ...(dto.notes === undefined ? {} : { notes: this.optionalText(dto.notes) }),
        ...(dto.verificationNote === undefined ? {} : { verificationNote: this.optionalText(dto.verificationNote) })
      }
    });

    await this.audit.record(adminUserId, "service_provider.updated", "ServiceProvider", providerId, {
      providerCode: provider.providerCode,
      previousStatus: existing.status,
      status: provider.status,
      serviceType: provider.serviceType
    });

    return this.adminProvider(provider);
  }

  async adminAssignProvider(adminUserId: string, requestId: string, dto: AssignServiceProviderDto) {
    const request = await this.prisma.serviceProviderRequest.findUnique({
      where: { id: requestId },
      include: this.adminInclude()
    });
    if (!request) {
      throw new NotFoundException("SME Services request not found");
    }
    if (request.status === ServiceProviderRequestStatus.COMPLETED || request.status === ServiceProviderRequestStatus.CANCELLED) {
      throw new BadRequestException("Completed or cancelled SME Services requests cannot receive provider assignments.");
    }
    if (request.readinessOnly || request.serviceType === ServiceProviderType.HEALTH_PROFESSIONAL) {
      throw new BadRequestException("Health professional requests remain readiness-only and cannot receive provider assignments.");
    }

    const provider = await this.prisma.serviceProvider.findUnique({ where: { id: dto.providerId } });
    if (!provider) {
      throw new NotFoundException("SME Services provider not found");
    }
    if (provider.status !== ServiceProviderStatus.APPROVED) {
      throw new BadRequestException("Only approved SME Services providers can be manually assigned.");
    }
    if (provider.readinessOnly || provider.serviceType === ServiceProviderType.HEALTH_PROFESSIONAL) {
      throw new BadRequestException("Readiness-only or health professional providers cannot be assigned in staging.");
    }
    if (provider.serviceType !== request.serviceType) {
      throw new BadRequestException("Provider service type must match the customer request service type.");
    }

    const updated = await this.prisma.serviceProviderRequest.update({
      where: { id: requestId },
      data: {
        assignedProviderId: provider.id,
        assignedByAdminId: adminUserId,
        assignedAt: new Date(),
        assignmentNote: this.optionalText(dto.assignmentNote),
        status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED
      },
      include: this.adminInclude()
    });

    await this.audit.record(adminUserId, "service_provider_request.provider_assigned", "ServiceProviderRequest", requestId, {
      requestNumber: request.requestNumber,
      previousStatus: request.status,
      status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED,
      providerId: provider.id,
      providerCode: provider.providerCode,
      serviceType: provider.serviceType
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

  private async uniqueProviderCode() {
    for (let i = 0; i < 5; i += 1) {
      const providerCode = `KGO-SP-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
      const existing = await this.prisma.serviceProvider.findUnique({ where: { providerCode }, select: { id: true } });
      if (!existing) return providerCode;
    }
    throw new BadRequestException("Could not generate a unique service provider code. Please try again.");
  }

  private assertProviderCanUseStatus(
    serviceType: ServiceProviderType,
    readinessOnly = false,
    status: ServiceProviderStatus = ServiceProviderStatus.PENDING_REVIEW
  ) {
    if ((readinessOnly || serviceType === ServiceProviderType.HEALTH_PROFESSIONAL) && status === ServiceProviderStatus.APPROVED) {
      throw new BadRequestException("Readiness-only and health professional providers can be saved for review only. They cannot be approved or assigned yet.");
    }
  }

  private providerReadinessOnly(serviceType: ServiceProviderType, readinessOnly?: boolean | null) {
    return readinessOnly === true || serviceType === ServiceProviderType.HEALTH_PROFESSIONAL;
  }

  private serviceAreas(serviceAreas?: string[] | null) {
    if (!serviceAreas) return Prisma.JsonNull;
    const normalized = serviceAreas.map((area) => area.trim()).filter(Boolean);
    return normalized.length ? normalized : Prisma.JsonNull;
  }

  private optionalText(value?: string | null) {
    return value?.trim() || null;
  }

  private reportDate(value: Date | string) {
    return new Date(value).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
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
      assignedProvider: {
        select: {
          id: true,
          sourceApplicationId: true,
          providerCode: true,
          fullName: true,
          businessName: true,
          serviceType: true,
          phoneNumber: true,
          email: true,
          city: true,
          state: true,
          serviceAreas: true,
          status: true,
          readinessOnly: true,
          notes: true,
          verificationNote: true,
          createdAt: true,
          updatedAt: true
        }
      },
      assignedByAdmin: {
        select: { id: true, fullName: true, email: true }
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
      customerUpdateNote: request.customerUpdateNote,
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
      customerUpdateNote: request.customerUpdateNote,
      assignmentNote: list ? undefined : request.assignmentNote,
      assignedAt: request.assignedAt,
      assignedProvider: request.assignedProvider ? this.adminProvider(request.assignedProvider) : null,
      assignedByAdmin: list ? undefined : request.assignedByAdmin,
      customer: request.customer,
      serviceAddress: request.serviceAddress,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }

  private adminProvider(provider: Prisma.ServiceProviderGetPayload<object>) {
    return {
      id: provider.id,
      providerCode: provider.providerCode,
      fullName: provider.fullName,
      businessName: provider.businessName,
      serviceType: provider.serviceType,
      phoneNumber: provider.phoneNumber,
      email: provider.email,
      city: provider.city,
      state: provider.state,
      serviceAreas: Array.isArray(provider.serviceAreas) ? provider.serviceAreas : [],
      status: provider.status,
      readinessOnly: provider.readinessOnly,
      notes: provider.notes,
      verificationNote: provider.verificationNote,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt
    };
  }
}
