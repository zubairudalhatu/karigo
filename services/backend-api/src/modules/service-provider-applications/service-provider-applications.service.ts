import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceProviderApplicationStatus, ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ApproveCreateServiceProviderDto } from "./dto/approve-create-service-provider.dto";
import { CreateServiceProviderApplicationDto } from "./dto/create-service-provider-application.dto";
import { ListServiceProviderApplicationsQueryDto } from "./dto/list-service-provider-applications-query.dto";
import { ReviewServiceProviderApplicationDto } from "./dto/review-service-provider-application.dto";
import { ServiceProviderApplicationStatusQueryDto } from "./dto/service-provider-application-status-query.dto";

const APPLICATION_SELECT = {
  id: true,
  applicationReference: true,
  fullName: true,
  businessName: true,
  serviceType: true,
  phoneNumber: true,
  email: true,
  city: true,
  state: true,
  serviceAreas: true,
  address: true,
  experienceSummary: true,
  toolsOrEquipment: true,
  availability: true,
  identificationType: true,
  identificationNumber: true,
  status: true,
  reviewNote: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reviewedByAdmin: { select: { id: true, fullName: true, email: true } },
  convertedProvider: { select: { id: true, providerCode: true, fullName: true, serviceType: true, status: true, readinessOnly: true } }
} satisfies Prisma.ServiceProviderApplicationSelect;

type ApplicationPayload = Prisma.ServiceProviderApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>;

@Injectable()
export class ServiceProviderApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService
  ) {}

  async create(dto: CreateServiceProviderApplicationDto) {
    if (!dto.detailsAccurateAccepted || !dto.reviewRequiredAccepted || !dto.noAutoDispatchAccepted) {
      throw new BadRequestException("Application confirmations are required before submission.");
    }

    const application = await this.prisma.serviceProviderApplication.create({
      data: {
        applicationReference: await this.nextApplicationReference(),
        fullName: dto.fullName,
        businessName: this.optionalText(dto.businessName),
        serviceType: dto.serviceType,
        phoneNumber: dto.phoneNumber,
        email: this.optionalText(dto.email),
        city: dto.city,
        state: dto.state,
        serviceAreas: this.serviceAreas(dto.serviceAreas),
        address: this.optionalText(dto.address),
        experienceSummary: this.optionalText(dto.experienceSummary),
        toolsOrEquipment: this.optionalText(dto.toolsOrEquipment),
        availability: this.optionalText(dto.availability),
        identificationType: this.optionalText(dto.identificationType),
        identificationNumber: this.optionalText(dto.identificationNumber),
        status: ServiceProviderApplicationStatus.SUBMITTED
      },
      select: APPLICATION_SELECT
    });

    return this.toPublicStatus(application);
  }

  async publicStatus(query: ServiceProviderApplicationStatusQueryDto) {
    const application = await this.prisma.serviceProviderApplication.findFirst({
      where: {
        phoneNumber: query.phoneNumber,
        ...(query.applicationReference ? { applicationReference: query.applicationReference } : {})
      },
      select: APPLICATION_SELECT,
      orderBy: { submittedAt: "desc" }
    });

    if (!application) {
      throw new NotFoundException("Service provider application status could not be found for the supplied details");
    }

    return this.toPublicStatus(application);
  }

  async adminList(query: ListServiceProviderApplicationsQueryDto) {
    const where: Prisma.ServiceProviderApplicationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
      ...(query.city ? { city: { contains: query.city, mode: "insensitive" as const } } : {}),
      ...(query.search ? {
        OR: [
          { applicationReference: { contains: query.search, mode: "insensitive" as const } },
          { fullName: { contains: query.search, mode: "insensitive" as const } },
          { businessName: { contains: query.search, mode: "insensitive" as const } },
          { phoneNumber: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" as const } }
        ]
      } : {})
    };

    const applications = await this.prisma.serviceProviderApplication.findMany({
      where,
      select: APPLICATION_SELECT,
      orderBy: { submittedAt: "desc" },
      take: 200
    });

    return applications.map((application) => this.toAdminList(application));
  }

  async adminDetail(applicationId: string) {
    const application = await this.prisma.serviceProviderApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!application) {
      throw new NotFoundException("Service provider application not found");
    }

    return this.toAdminDetail(application);
  }

  async adminReview(applicationId: string, adminUserId: string, dto: ReviewServiceProviderApplicationDto) {
    const current = await this.prisma.serviceProviderApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, applicationReference: true, serviceType: true, status: true }
    });
    if (!current) {
      throw new NotFoundException("Service provider application not found");
    }
    if (dto.status === ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER) {
      throw new BadRequestException("Use approve-create-provider to convert an application to a provider record.");
    }
    if (current.serviceType === ServiceProviderType.HEALTH_PROFESSIONAL && dto.status === ServiceProviderApplicationStatus.APPROVED) {
      throw new BadRequestException("Health professional applications remain readiness-only and cannot be approved as live healthcare booking.");
    }

    const application = await this.prisma.serviceProviderApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        reviewNote: this.optionalText(dto.reviewNote),
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId
      },
      select: APPLICATION_SELECT
    });

    await this.audit.record(adminUserId, "service_provider_application.reviewed", "ServiceProviderApplication", applicationId, {
      applicationReference: current.applicationReference,
      previousStatus: current.status,
      status: dto.status,
      serviceType: current.serviceType
    });

    return this.toAdminDetail(application);
  }

  async approveCreateProvider(applicationId: string, adminUserId: string, dto: ApproveCreateServiceProviderDto = {}) {
    const current = await this.prisma.serviceProviderApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!current) {
      throw new NotFoundException("Service provider application not found");
    }
    if (current.convertedProvider) {
      throw new BadRequestException("This application has already been converted to a provider record.");
    }
    if (
      current.status === ServiceProviderApplicationStatus.REJECTED ||
      current.status === ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER
    ) {
      throw new BadRequestException("This application cannot be converted in its current status.");
    }
    if (current.serviceType === ServiceProviderType.HEALTH_PROFESSIONAL) {
      throw new BadRequestException("Health professional applications cannot be converted to live service providers yet.");
    }

    const application = await this.prisma.$transaction(async (tx) => {
      await tx.serviceProvider.create({
        data: {
          providerCode: await this.nextProviderCode(tx),
          sourceApplication: { connect: { id: applicationId } },
          fullName: current.fullName,
          businessName: current.businessName,
          serviceType: current.serviceType,
          phoneNumber: current.phoneNumber,
          email: current.email,
          city: current.city,
          state: current.state,
          serviceAreas: current.serviceAreas === null ? Prisma.JsonNull : (current.serviceAreas as Prisma.InputJsonValue),
          status: ServiceProviderStatus.PENDING_REVIEW,
          readinessOnly: false,
          notes: this.optionalText(dto.providerNote) ?? `Created from ${current.applicationReference}`,
          verificationNote: this.optionalText(dto.verificationNote ?? dto.reviewNote)
        }
      });

      return tx.serviceProviderApplication.update({
        where: { id: applicationId },
        data: {
          status: ServiceProviderApplicationStatus.CONVERTED_TO_PROVIDER,
          reviewNote: this.optionalText(dto.reviewNote) ?? current.reviewNote,
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId
        },
        select: APPLICATION_SELECT
      });
    });

    await this.audit.record(adminUserId, "service_provider_application.converted", "ServiceProviderApplication", applicationId, {
      applicationReference: current.applicationReference,
      serviceType: current.serviceType,
      providerCode: application.convertedProvider?.providerCode,
      providerStatus: ServiceProviderStatus.PENDING_REVIEW
    });

    return this.toAdminDetail(application);
  }

  private async nextApplicationReference(): Promise<string> {
    const reference = `KGO-SPA-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await this.prisma.serviceProviderApplication.findUnique({ where: { applicationReference: reference }, select: { id: true } });
    return exists ? this.nextApplicationReference() : reference;
  }

  private async nextProviderCode(tx: Pick<PrismaService, "serviceProvider"> | Prisma.TransactionClient): Promise<string> {
    const providerCode = `KGO-SP-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await tx.serviceProvider.findUnique({ where: { providerCode }, select: { id: true } });
    return exists ? this.nextProviderCode(tx) : providerCode;
  }

  private serviceAreas(serviceAreas?: string[] | null) {
    if (!serviceAreas) return Prisma.JsonNull;
    const normalized = serviceAreas.map((area) => area.trim()).filter(Boolean);
    return normalized.length ? normalized : Prisma.JsonNull;
  }

  private optionalText(value?: string | null) {
    return value?.trim() || null;
  }

  private toPublicStatus(application: ApplicationPayload) {
    return {
      applicationReference: application.applicationReference,
      fullName: application.fullName,
      serviceType: application.serviceType,
      status: application.status,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      message: this.statusMessage(application.status)
    };
  }

  private toAdminList(application: ApplicationPayload) {
    const { identificationNumber: _identificationNumber, ...safe } = this.toAdminDetail(application);
    return safe;
  }

  private toAdminDetail(application: ApplicationPayload) {
    return {
      ...application,
      serviceAreas: Array.isArray(application.serviceAreas) ? application.serviceAreas : [],
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  private statusMessage(status: ServiceProviderApplicationStatus) {
    const messages: Record<ServiceProviderApplicationStatus, string> = {
      SUBMITTED: "Your service provider application has been received and is waiting for review.",
      UNDER_REVIEW: "Your application is under review by KariGO.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing the review.",
      APPROVED: "Your application has been approved for the next onboarding step. This does not activate automatic dispatch or payouts.",
      REJECTED: "Your application was not approved at this time.",
      CONVERTED_TO_PROVIDER: "Your application has been converted to an internal provider record for KariGO onboarding review."
    };
    return messages[status];
  }
}
