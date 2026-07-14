import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceProviderApplicationStatus, ServiceProviderRequestStatus, ServiceProviderStatus, ServiceProviderType, SmeServicesPilotDecisionStatus, SmeServicesPilotParticipantStatus, SmeServicesPilotParticipantType } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignServiceProviderDto } from "./dto/assign-service-provider.dto";
import { CreateServiceProviderDto } from "./dto/create-service-provider.dto";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";
import { CreateSmeServicesPilotParticipantDto } from "./dto/create-sme-services-pilot-participant.dto";
import { ListServiceProvidersQueryDto } from "./dto/list-service-providers-query.dto";
import { ListServiceProviderRequestsQueryDto } from "./dto/list-service-provider-requests-query.dto";
import { ListSmeServicesPilotParticipantsQueryDto } from "./dto/list-sme-services-pilot-participants-query.dto";
import { PreviewSmeServicesPilotInvitationTemplateDto } from "./dto/preview-sme-services-pilot-invitation-template.dto";
import { RecordSmeServicesPilotLaunchDecisionDto } from "./dto/record-sme-services-pilot-launch-decision.dto";
import { UpdateSmeServicesPilotParticipantDto } from "./dto/update-sme-services-pilot-participant.dto";
import { UpdateSmeServicesPilotReadinessDto } from "./dto/update-sme-services-pilot-readiness.dto";
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
  { type: ServiceProviderType.APPLIANCE_REPAIR, label: "Appliance repair technician", description: "Home and shop appliance inspection and repair requests." },
  { type: ServiceProviderType.FUMIGATION, label: "Fumigation / pest control", description: "Pest-control and fumigation requests for homes, shops and offices." },
  { type: ServiceProviderType.WELDER, label: "Welder", description: "Metalwork, gate, burglary-proof and light fabrication requests." },
  { type: ServiceProviderType.TILER, label: "Tiler", description: "Tile fitting, repair and finishing requests." },
  { type: ServiceProviderType.CCTV_TECHNICIAN, label: "CCTV / security technician", description: "CCTV, access-control and light security-device support requests." },
  { type: ServiceProviderType.MOVING_HELP, label: "Moving / loading help", description: "Manual moving, loading and small relocation support requests." },
  {
    type: ServiceProviderType.HEALTH_PROFESSIONAL,
    label: "Doctor / health professional",
    description: "Health professional onboarding is readiness-only and requires future approval before live booking.",
    readinessOnly: true,
    statusLabel: "Future approval required"
  },
  { type: ServiceProviderType.OTHER, label: "Other approved service provider", description: "Describe another service need for KariGO review." }
];

const PILOT_READINESS_ITEMS = [
  {
    key: "pilot_scope_confirmed",
    category: "Operations",
    label: "Pilot scope confirmed",
    description: "Pilot zones, invited customer group, supported service categories and internal owners are agreed.",
    sortOrder: 10,
    isRequired: true
  },
  {
    key: "provider_review_queue_clear",
    category: "Providers",
    label: "Provider application review queue checked",
    description: "Provider applications have been reviewed, rejected, or moved into the correct onboarding status before pilot invitations.",
    sortOrder: 20,
    isRequired: true
  },
  {
    key: "approved_provider_directory_ready",
    category: "Providers",
    label: "Approved provider directory ready",
    description: "Approved non-readiness-only provider records are available for manual matching and assignment where appropriate.",
    sortOrder: 30,
    isRequired: true
  },
  {
    key: "health_readiness_blocked",
    category: "Compliance",
    label: "Health professional category remains blocked",
    description: "Doctor and health professional records remain readiness-only until compliance, policy and management approvals are complete.",
    sortOrder: 40,
    isRequired: true
  },
  {
    key: "customer_request_flow_verified",
    category: "Customer Flow",
    label: "Customer request flow verified",
    description: "Customer App SME Services submission, request history and request detail/status tracking have been tested in staging.",
    sortOrder: 50,
    isRequired: true
  },
  {
    key: "admin_review_notes_ready",
    category: "Admin Operations",
    label: "Admin review notes ready",
    description: "Internal admin notes and customer-visible update notes are available and used without exposing private provider details.",
    sortOrder: 60,
    isRequired: true
  },
  {
    key: "support_escalation_ready",
    category: "Support",
    label: "Support escalation route ready",
    description: "Support and operations owners know how to escalate SME Services pilot issues, disputes, cancellations and safety concerns.",
    sortOrder: 70,
    isRequired: true
  },
  {
    key: "pilot_report_export_ready",
    category: "Management",
    label: "Pilot report export ready",
    description: "Admin can generate the SME Services pilot report for internal management review without exposing sensitive contact details.",
    sortOrder: 80,
    isRequired: true
  },
  {
    key: "provider_contact_privacy_confirmed",
    category: "Privacy",
    label: "Provider contact privacy confirmed",
    description: "Customer-facing responses and screens do not expose provider phone numbers, emails, private admin notes, OTPs or payment data.",
    sortOrder: 90,
    isRequired: true
  },
  {
    key: "manual_coordination_script_ready",
    category: "Operations",
    label: "Manual coordination script ready",
    description: "Operations has a simple call/message script for coordinating the customer and provider during the internal pilot.",
    sortOrder: 100,
    isRequired: false
  }
] as const;

const PILOT_INVITATION_TEMPLATES = [
  {
    key: "customer_pilot_invitation",
    audience: "Pilot customer",
    title: "Customer pilot invitation",
    subject: "KariGO SME Services controlled pilot invitation",
    description: "Manual invitation text for selected customers joining the controlled SME Services pilot.",
    suggestedChannels: ["Phone follow-up", "WhatsApp manual copy", "Email manual copy"],
    requiredVariables: ["recipientName", "pilotZone", "pilotDate", "supportContact"],
    bodyTemplate: [
      "Hello {{recipientName}},",
      "",
      "KariGO is preparing a controlled SME Services pilot in {{pilotZone}} from {{pilotDate}}. You are invited to help test how customers request trusted service providers through KariGO.",
      "",
      "Participation is optional and KariGO operations will coordinate every pilot request manually. Live payments, automatic provider dispatch and public provider contact sharing are not active for this pilot.",
      "",
      "If you have questions, please contact {{supportContact}}.",
      "",
      "Additional note: {{customNote}}"
    ].join("\n")
  },
  {
    key: "service_provider_pilot_invitation",
    audience: "Service provider",
    title: "Service provider pilot invitation",
    subject: "KariGO SME Services provider pilot invitation",
    description: "Manual invitation text for approved non-readiness-only SME service providers.",
    suggestedChannels: ["Phone follow-up", "WhatsApp manual copy", "Email manual copy"],
    requiredVariables: ["recipientName", "pilotZone", "serviceFocus", "pilotDate", "supportContact"],
    bodyTemplate: [
      "Hello {{recipientName}},",
      "",
      "KariGO is preparing a controlled SME Services pilot for {{serviceFocus}} providers in {{pilotZone}} from {{pilotDate}}.",
      "",
      "This is a manual operations pilot only. It does not create provider app login, automated dispatch, payout automation, live payment collection or public customer access to your private contact details.",
      "",
      "KariGO operations will contact you manually if a suitable pilot request needs review.",
      "",
      "For questions, please contact {{supportContact}}.",
      "",
      "Additional note: {{customNote}}"
    ].join("\n")
  },
  {
    key: "internal_observer_briefing",
    audience: "Internal observer",
    title: "Internal observer briefing",
    subject: "KariGO SME Services pilot observer briefing",
    description: "Manual briefing text for management or internal observers monitoring the controlled pilot.",
    suggestedChannels: ["Email manual copy", "Internal note", "Meeting agenda"],
    requiredVariables: ["recipientName", "pilotZone", "pilotDate", "supportContact"],
    bodyTemplate: [
      "Hello {{recipientName}},",
      "",
      "You are listed as an internal observer for the KariGO SME Services controlled pilot in {{pilotZone}} from {{pilotDate}}.",
      "",
      "Your role is to observe pilot readiness, request handling, customer experience, provider coordination and support follow-up. This observer role does not activate live dispatch, payment collection, provider payout, provider login or medical booking.",
      "",
      "Please share observations with {{supportContact}}.",
      "",
      "Additional note: {{customNote}}"
    ].join("\n")
  },
  {
    key: "operations_staff_briefing",
    audience: "Operations staff",
    title: "Operations staff briefing",
    subject: "KariGO SME Services pilot operations briefing",
    description: "Manual briefing text for operations staff coordinating pilot requests and providers.",
    suggestedChannels: ["Internal note", "Email manual copy", "Team briefing"],
    requiredVariables: ["recipientName", "pilotZone", "pilotDate", "supportContact"],
    bodyTemplate: [
      "Hello {{recipientName}},",
      "",
      "You are assigned to support KariGO SME Services pilot operations in {{pilotZone}} from {{pilotDate}}.",
      "",
      "Please coordinate requests manually, keep provider contact details private, avoid making payment promises, and record operational notes in the Admin Portal. Do not treat any health professional readiness record as live medical booking.",
      "",
      "Escalate blockers or customer safety concerns to {{supportContact}}.",
      "",
      "Additional note: {{customNote}}"
    ].join("\n")
  },
  {
    key: "support_staff_briefing",
    audience: "Support staff",
    title: "Support staff briefing",
    subject: "KariGO SME Services pilot support briefing",
    description: "Manual briefing text for support staff handling SME Services pilot questions and issues.",
    suggestedChannels: ["Internal note", "Email manual copy", "Team briefing"],
    requiredVariables: ["recipientName", "pilotZone", "pilotDate", "supportContact"],
    bodyTemplate: [
      "Hello {{recipientName}},",
      "",
      "You are assigned to support KariGO SME Services pilot participants in {{pilotZone}} from {{pilotDate}}.",
      "",
      "Please respond with clear pilot-stage wording, route operational issues to the operations team, and avoid sharing provider private phone numbers, emails, payment details, OTPs or internal admin notes.",
      "",
      "Escalate unresolved issues to {{supportContact}}.",
      "",
      "Additional note: {{customNote}}"
    ].join("\n")
  }
] as const;

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

  async adminPilotReadiness() {
    await this.ensurePilotReadinessItems();

    const [items, summary] = await Promise.all([
      this.prisma.smeServicesPilotReadinessItem.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
      this.adminSummary()
    ]);
    const requiredItems = items.filter((item) => item.isRequired);
    const optionalItems = items.filter((item) => !item.isRequired);
    const requiredCompleted = requiredItems.filter((item) => item.isCompleted).length;
    const optionalCompleted = optionalItems.filter((item) => item.isCompleted).length;
    const approvedProvidersReady = summary.providers.approved > 0;
    const providerQueueReady = summary.providerApplications.pending === 0;
    const readyForPilot = requiredCompleted === requiredItems.length && approvedProvidersReady;

    return {
      status: readyForPilot ? "READY_FOR_INTERNAL_PILOT" : "NOT_READY",
      requiredTotal: requiredItems.length,
      requiredCompleted,
      optionalTotal: optionalItems.length,
      optionalCompleted,
      items: items.map((item) => ({
        id: item.id,
        key: item.key,
        category: item.category,
        label: item.label,
        description: item.description,
        sortOrder: item.sortOrder,
        isRequired: item.isRequired,
        isCompleted: item.isCompleted,
        note: item.note,
        completedAt: item.completedAt,
        updatedAt: item.updatedAt
      })),
      systemSnapshot: {
        approvedProviders: summary.providers.approved,
        pendingProviderApplications: summary.providerApplications.pending,
        activeRequests: summary.requests.active,
        readinessOnlyProviders: summary.providers.readinessOnly,
        healthProfessionalReadinessApplications: summary.providerApplications.healthProfessionalReadiness,
        approvedProvidersReady,
        providerQueueReady
      },
      guardrails: summary.guardrails,
      safetyNote: "This checklist is internal only. Completing it does not activate live dispatch, payments, payouts, provider login, provider app access, medical booking or public provider contact exposure."
    };
  }

  async adminPilotLaunchControl() {
    const [readiness, latestDecision, history] = await Promise.all([
      this.adminPilotReadiness(),
      this.prisma.smeServicesPilotLaunchDecision.findFirst({ orderBy: { recordedAt: "desc" } }),
      this.prisma.smeServicesPilotLaunchDecision.findMany({
        orderBy: { recordedAt: "desc" },
        take: 10
      })
    ]);

    return {
      status: latestDecision?.decisionStatus ?? SmeServicesPilotDecisionStatus.NOT_REVIEWED,
      readiness,
      latestDecision: latestDecision ? this.adminPilotLaunchDecision(latestDecision) : null,
      history: history.map((decision) => this.adminPilotLaunchDecision(decision)),
      decisionOptions: [
        SmeServicesPilotDecisionStatus.GO_INTERNAL_PILOT,
        SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
        SmeServicesPilotDecisionStatus.NO_GO,
        SmeServicesPilotDecisionStatus.DEFERRED
      ],
      guardrails: readiness.guardrails,
      safetyNote: "This launch control record is internal only. Recording Go/No-Go does not activate live dispatch, payments, payouts, provider login, provider app access, push notifications, medical booking or public provider contact sharing."
    };
  }

  async adminRecordPilotLaunchDecision(adminUserId: string, dto: RecordSmeServicesPilotLaunchDecisionDto) {
    const readiness = await this.adminPilotReadiness();
    if (dto.decisionStatus === SmeServicesPilotDecisionStatus.GO_INTERNAL_PILOT && readiness.status !== "READY_FOR_INTERNAL_PILOT") {
      throw new BadRequestException("SME Services readiness checklist must be complete before recording Go for internal pilot.");
    }

    const decision = await this.prisma.smeServicesPilotLaunchDecision.create({
      data: {
        decisionStatus: dto.decisionStatus,
        decisionTitle: this.optionalText(dto.decisionTitle),
        decisionSummary: this.optionalText(dto.decisionSummary),
        conditions: this.optionalText(dto.conditions),
        blockers: this.optionalText(dto.blockers),
        readinessStatusSnapshot: readiness.status,
        requiredCompletedSnapshot: readiness.requiredCompleted,
        requiredTotalSnapshot: readiness.requiredTotal,
        optionalCompletedSnapshot: readiness.optionalCompleted,
        optionalTotalSnapshot: readiness.optionalTotal,
        approvedProvidersSnapshot: readiness.systemSnapshot.approvedProviders,
        pendingProviderApplicationsSnapshot: readiness.systemSnapshot.pendingProviderApplications,
        activeRequestsSnapshot: readiness.systemSnapshot.activeRequests,
        recordedByAdminId: adminUserId
      }
    });

    const history = await this.prisma.smeServicesPilotLaunchDecision.findMany({
      orderBy: { recordedAt: "desc" },
      take: 10
    });

    await this.audit.record(adminUserId, "sme_services.pilot_launch_decision_recorded", "SmeServicesPilotLaunchDecision", decision.id, {
      decisionStatus: decision.decisionStatus,
      readinessStatusSnapshot: decision.readinessStatusSnapshot,
      requiredCompletedSnapshot: decision.requiredCompletedSnapshot,
      requiredTotalSnapshot: decision.requiredTotalSnapshot,
      approvedProvidersSnapshot: decision.approvedProvidersSnapshot
    });

    return {
      status: decision.decisionStatus,
      readiness,
      latestDecision: this.adminPilotLaunchDecision(decision),
      history: history.map((item) => this.adminPilotLaunchDecision(item)),
      decisionOptions: [
        SmeServicesPilotDecisionStatus.GO_INTERNAL_PILOT,
        SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
        SmeServicesPilotDecisionStatus.NO_GO,
        SmeServicesPilotDecisionStatus.DEFERRED
      ],
      guardrails: readiness.guardrails,
      safetyNote: "This launch control record is internal only. Recording Go/No-Go does not activate live dispatch, payments, payouts, provider login, provider app access, push notifications, medical booking or public provider contact sharing."
    };
  }

  adminPilotInvitationTemplates() {
    return {
      templates: PILOT_INVITATION_TEMPLATES.map((template) => this.adminPilotInvitationTemplate(template)),
      guardrails: {
        automatedSendingEnabled: false,
        smsEnabled: false,
        emailEnabled: false,
        whatsappEnabled: false,
        pushEnabled: false,
        liveDispatchEnabled: false,
        livePaymentsEnabled: false,
        providerLoginEnabled: false,
        providerAppAccessEnabled: false,
        medicalBookingEnabled: false,
        note: "Templates are for manual copy/preparation only. KariGO does not send invitations from this feature."
      },
      safetyNote: "Do not paste passwords, OTPs, payment details, private provider contact details, sensitive medical details or live credentials into invitation templates."
    };
  }

  adminPreviewPilotInvitationTemplate(dto: PreviewSmeServicesPilotInvitationTemplateDto) {
    const template = PILOT_INVITATION_TEMPLATES.find((item) => item.key === dto.templateKey);
    if (!template) {
      throw new BadRequestException("Unknown SME Services pilot invitation template.");
    }

    const variables = {
      recipientName: this.invitationValue(dto.recipientName, "there"),
      pilotZone: this.invitationValue(dto.pilotZone, "the selected pilot zone"),
      pilotDate: this.invitationValue(dto.pilotDate, "the approved pilot date"),
      serviceFocus: this.invitationValue(dto.serviceFocus, "SME Services"),
      supportContact: this.invitationValue(dto.supportContact, "the KariGO operations team"),
      customNote: this.invitationValue(dto.customNote, "No additional note.")
    };
    const messageText = this.renderInvitationTemplate(template.bodyTemplate, variables);

    return {
      template: this.adminPilotInvitationTemplate(template),
      preview: {
        subject: template.subject,
        messageText,
        suggestedChannels: [...template.suggestedChannels],
        copyInstructions: "Copy this text manually into the approved communication channel. This endpoint does not send SMS, email, WhatsApp, push or in-app messages.",
        safetyNote: "Review the message before sending manually. Do not include credentials, OTPs, private provider contact details, payment details or sensitive medical information."
      },
      variables
    };
  }

  async adminListPilotParticipants(query: ListSmeServicesPilotParticipantsQueryDto) {
    const where: Prisma.SmeServicesPilotParticipantWhereInput = {
      ...(query.participantType ? { participantType: query.participantType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.city ? { city: { contains: query.city.trim(), mode: "insensitive" as const } } : {}),
      ...(query.pilotZone ? { pilotZone: { contains: query.pilotZone.trim(), mode: "insensitive" as const } } : {}),
      ...(query.search ? {
        OR: [
          { displayName: { contains: query.search, mode: "insensitive" as const } },
          { phoneNumber: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" as const } },
          { organization: { contains: query.search, mode: "insensitive" as const } },
          { pilotZone: { contains: query.search, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const [items, total, customers, providers, observers, readyToInvite, invited, confirmed, declined, removed] = await Promise.all([
      this.prisma.smeServicesPilotParticipant.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 200
      }),
      this.prisma.smeServicesPilotParticipant.count(),
      this.prisma.smeServicesPilotParticipant.count({ where: { participantType: SmeServicesPilotParticipantType.CUSTOMER } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { participantType: SmeServicesPilotParticipantType.SERVICE_PROVIDER } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { participantType: SmeServicesPilotParticipantType.INTERNAL_OBSERVER } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { status: SmeServicesPilotParticipantStatus.READY_TO_INVITE } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { status: SmeServicesPilotParticipantStatus.INVITED_MANUALLY } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { status: SmeServicesPilotParticipantStatus.CONFIRMED } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { status: SmeServicesPilotParticipantStatus.DECLINED } }),
      this.prisma.smeServicesPilotParticipant.count({ where: { status: SmeServicesPilotParticipantStatus.REMOVED } })
    ]);

    return {
      summary: { total, customers, providers, observers, readyToInvite, invited, confirmed, declined, removed },
      items: items.map((participant) => this.adminPilotParticipant(participant)),
      guardrails: {
        liveInvitationsSent: false,
        liveDispatchEnabled: false,
        providerLoginEnabled: false,
        providerAppAccessEnabled: false,
        livePaymentsEnabled: false,
        note: "Pilot participants are internal coordination records only. KariGO must invite and confirm participants manually outside this system."
      }
    };
  }

  async adminCreatePilotParticipant(adminUserId: string, dto: CreateSmeServicesPilotParticipantDto) {
    const status = dto.status ?? SmeServicesPilotParticipantStatus.DRAFT;
    await this.assertPilotParticipantAllowed({
      participantType: dto.participantType,
      status,
      relatedProviderId: dto.relatedProviderId
    });
    const now = new Date();

    const participant = await this.prisma.smeServicesPilotParticipant.create({
      data: {
        participantType: dto.participantType,
        status,
        displayName: dto.displayName.trim(),
        phoneNumber: this.optionalText(dto.phoneNumber),
        email: this.optionalText(dto.email),
        organization: this.optionalText(dto.organization),
        city: this.optionalText(dto.city),
        pilotZone: this.optionalText(dto.pilotZone),
        relatedUserId: this.optionalText(dto.relatedUserId),
        relatedProviderId: this.optionalText(dto.relatedProviderId),
        invitationChannel: dto.invitationChannel,
        invitationNote: this.optionalText(dto.invitationNote),
        internalNotes: this.optionalText(dto.internalNotes),
        consentConfirmed: dto.consentConfirmed ?? false,
        safetyBriefingCompleted: dto.safetyBriefingCompleted ?? false,
        invitedAt: this.participantStatusInvited(status) ? now : undefined,
        confirmedAt: status === SmeServicesPilotParticipantStatus.CONFIRMED ? now : undefined,
        createdByAdminId: adminUserId,
        updatedByAdminId: adminUserId
      }
    });

    await this.audit.record(adminUserId, "sme_services.pilot_participant_created", "SmeServicesPilotParticipant", participant.id, {
      participantType: participant.participantType,
      status: participant.status,
      relatedProviderId: participant.relatedProviderId
    });

    return this.adminPilotParticipant(participant);
  }

  async adminPilotParticipantDetail(participantId: string) {
    const participant = await this.prisma.smeServicesPilotParticipant.findUnique({ where: { id: participantId } });
    if (!participant) {
      throw new NotFoundException("SME Services pilot participant not found");
    }
    return this.adminPilotParticipant(participant);
  }

  async adminUpdatePilotParticipant(adminUserId: string, participantId: string, dto: UpdateSmeServicesPilotParticipantDto) {
    const existing = await this.prisma.smeServicesPilotParticipant.findUnique({ where: { id: participantId } });
    if (!existing) {
      throw new NotFoundException("SME Services pilot participant not found");
    }

    const nextParticipantType = dto.participantType ?? existing.participantType;
    const nextStatus = dto.status ?? existing.status;
    const nextRelatedProviderId = dto.relatedProviderId === undefined ? existing.relatedProviderId : this.optionalText(dto.relatedProviderId);
    await this.assertPilotParticipantAllowed({
      participantType: nextParticipantType,
      status: nextStatus,
      relatedProviderId: nextRelatedProviderId
    });
    const now = new Date();

    const participant = await this.prisma.smeServicesPilotParticipant.update({
      where: { id: participantId },
      data: {
        ...(dto.participantType === undefined ? {} : { participantType: dto.participantType }),
        ...(dto.status === undefined ? {} : { status: dto.status }),
        ...(dto.displayName === undefined ? {} : { displayName: dto.displayName.trim() }),
        ...(dto.phoneNumber === undefined ? {} : { phoneNumber: this.optionalText(dto.phoneNumber) }),
        ...(dto.email === undefined ? {} : { email: this.optionalText(dto.email) }),
        ...(dto.organization === undefined ? {} : { organization: this.optionalText(dto.organization) }),
        ...(dto.city === undefined ? {} : { city: this.optionalText(dto.city) }),
        ...(dto.pilotZone === undefined ? {} : { pilotZone: this.optionalText(dto.pilotZone) }),
        ...(dto.relatedUserId === undefined ? {} : { relatedUserId: this.optionalText(dto.relatedUserId) }),
        ...(dto.relatedProviderId === undefined ? {} : { relatedProviderId: this.optionalText(dto.relatedProviderId) }),
        ...(dto.invitationChannel === undefined ? {} : { invitationChannel: dto.invitationChannel }),
        ...(dto.invitationNote === undefined ? {} : { invitationNote: this.optionalText(dto.invitationNote) }),
        ...(dto.internalNotes === undefined ? {} : { internalNotes: this.optionalText(dto.internalNotes) }),
        ...(dto.consentConfirmed === undefined ? {} : { consentConfirmed: dto.consentConfirmed }),
        ...(dto.safetyBriefingCompleted === undefined ? {} : { safetyBriefingCompleted: dto.safetyBriefingCompleted }),
        ...(this.participantStatusInvited(nextStatus) && !existing.invitedAt ? { invitedAt: now } : {}),
        ...(nextStatus === SmeServicesPilotParticipantStatus.CONFIRMED && !existing.confirmedAt ? { confirmedAt: now } : {}),
        updatedByAdminId: adminUserId
      }
    });

    await this.audit.record(adminUserId, "sme_services.pilot_participant_updated", "SmeServicesPilotParticipant", participant.id, {
      previousStatus: existing.status,
      status: participant.status,
      participantType: participant.participantType,
      relatedProviderId: participant.relatedProviderId
    });

    return this.adminPilotParticipant(participant);
  }

  async adminUpdatePilotReadiness(adminUserId: string, dto: UpdateSmeServicesPilotReadinessDto) {
    await this.ensurePilotReadinessItems();
    const allowedKeys = new Set<string>(PILOT_READINESS_ITEMS.map((item) => item.key));
    const updates = dto.items.filter((item) => allowedKeys.has(item.key));
    const ignoredKeys = dto.items.map((item) => item.key).filter((key) => !allowedKeys.has(key));

    await Promise.all(updates.map((item) => this.prisma.smeServicesPilotReadinessItem.update({
      where: { key: item.key },
      data: {
        isCompleted: item.isCompleted,
        note: this.optionalText(item.note),
        updatedByAdminId: adminUserId,
        completedAt: item.isCompleted ? new Date() : null
      }
    })));

    await this.audit.record(adminUserId, "sme_services.pilot_readiness_updated", "SmeServicesPilotReadiness", "pilot-readiness", {
      updatedKeys: updates.map((item) => item.key),
      ignoredKeys,
      completedCount: updates.filter((item) => item.isCompleted).length
    });

    return this.adminPilotReadiness();
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

  private invitationValue(value: string | undefined, fallback: string) {
    return value?.trim() || fallback;
  }

  private renderInvitationTemplate(template: string, variables: Record<string, string>) {
    return Object.entries(variables).reduce((message, [key, value]) => message.replaceAll(`{{${key}}}`, value), template);
  }

  private adminPilotInvitationTemplate(template: (typeof PILOT_INVITATION_TEMPLATES)[number]) {
    return {
      key: template.key,
      audience: template.audience,
      title: template.title,
      subject: template.subject,
      description: template.description,
      suggestedChannels: [...template.suggestedChannels],
      requiredVariables: [...template.requiredVariables],
      messageTemplate: template.bodyTemplate,
      safetyNote: "Manual copy template only. This does not send messages or activate live SME Services operations."
    };
  }

  private adminPilotLaunchDecision(decision: Prisma.SmeServicesPilotLaunchDecisionGetPayload<object>) {
    return {
      id: decision.id,
      decisionStatus: decision.decisionStatus,
      decisionTitle: decision.decisionTitle,
      decisionSummary: decision.decisionSummary,
      conditions: decision.conditions,
      blockers: decision.blockers,
      readinessStatusSnapshot: decision.readinessStatusSnapshot,
      requiredCompletedSnapshot: decision.requiredCompletedSnapshot,
      requiredTotalSnapshot: decision.requiredTotalSnapshot,
      optionalCompletedSnapshot: decision.optionalCompletedSnapshot,
      optionalTotalSnapshot: decision.optionalTotalSnapshot,
      approvedProvidersSnapshot: decision.approvedProvidersSnapshot,
      pendingProviderApplicationsSnapshot: decision.pendingProviderApplicationsSnapshot,
      activeRequestsSnapshot: decision.activeRequestsSnapshot,
      recordedByAdminId: decision.recordedByAdminId,
      recordedAt: decision.recordedAt,
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt
    };
  }

  private async assertPilotParticipantAllowed(input: {
    participantType: SmeServicesPilotParticipantType;
    status: SmeServicesPilotParticipantStatus;
    relatedProviderId?: string | null;
  }) {
    if (input.relatedProviderId && input.participantType !== SmeServicesPilotParticipantType.SERVICE_PROVIDER) {
      throw new BadRequestException("Related provider records can only be attached to service provider pilot participants.");
    }
    if (!input.relatedProviderId) return;

    const provider = await this.prisma.serviceProvider.findUnique({ where: { id: input.relatedProviderId } });
    if (!provider) {
      throw new NotFoundException("SME Services provider not found");
    }
    const inviteStatuses: SmeServicesPilotParticipantStatus[] = [
      SmeServicesPilotParticipantStatus.READY_TO_INVITE,
      SmeServicesPilotParticipantStatus.INVITED_MANUALLY,
      SmeServicesPilotParticipantStatus.CONFIRMED
    ];
    const inviteStatus = inviteStatuses.includes(input.status);
    if (inviteStatus && (provider.readinessOnly || provider.serviceType === ServiceProviderType.HEALTH_PROFESSIONAL)) {
      throw new BadRequestException("Readiness-only and health professional providers can remain in the pilot list for review only. They cannot be marked ready, invited or confirmed.");
    }
  }

  private participantStatusInvited(status: SmeServicesPilotParticipantStatus) {
    return status === SmeServicesPilotParticipantStatus.INVITED_MANUALLY || status === SmeServicesPilotParticipantStatus.CONFIRMED;
  }

  private adminPilotParticipant(participant: Prisma.SmeServicesPilotParticipantGetPayload<object>) {
    return {
      id: participant.id,
      participantType: participant.participantType,
      status: participant.status,
      displayName: participant.displayName,
      phoneNumber: participant.phoneNumber,
      email: participant.email,
      organization: participant.organization,
      city: participant.city,
      pilotZone: participant.pilotZone,
      relatedUserId: participant.relatedUserId,
      relatedProviderId: participant.relatedProviderId,
      invitationChannel: participant.invitationChannel,
      invitationNote: participant.invitationNote,
      internalNotes: participant.internalNotes,
      consentConfirmed: participant.consentConfirmed,
      safetyBriefingCompleted: participant.safetyBriefingCompleted,
      invitedAt: participant.invitedAt,
      confirmedAt: participant.confirmedAt,
      createdByAdminId: participant.createdByAdminId,
      updatedByAdminId: participant.updatedByAdminId,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt
    };
  }

  private async ensurePilotReadinessItems() {
    await Promise.all(PILOT_READINESS_ITEMS.map((item) => this.prisma.smeServicesPilotReadinessItem.upsert({
      where: { key: item.key },
      update: {
        category: item.category,
        label: item.label,
        description: item.description,
        sortOrder: item.sortOrder,
        isRequired: item.isRequired
      },
      create: item
    })));
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
