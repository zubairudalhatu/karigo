import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, VendorApplicationStatus } from "@prisma/client";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { ReviewVendorApplicationDto } from "./dto/review-vendor-application.dto";
import { VendorApplicationStatusQueryDto } from "./dto/vendor-application-status-query.dto";

const APPLICATION_SELECT = {
  id: true,
  reference: true,
  businessCategory: true,
  businessName: true,
  tradingName: true,
  businessType: true,
  businessDescription: true,
  businessAddress: true,
  state: true,
  city: true,
  area: true,
  serviceAreas: true,
  operatingHours: true,
  businessPhoneNumber: true,
  businessEmail: true,
  websiteOrSocialLink: true,
  contactFullName: true,
  contactRole: true,
  contactPhoneNumber: true,
  contactEmail: true,
  preferredContactMethod: true,
  deliveryReadiness: true,
  deliveryPreference: true,
  averagePreparationTime: true,
  numberOfStaff: true,
  catalogueCategory: true,
  estimatedCatalogueSize: true,
  existingDelivery: true,
  brandAssets: true,
  documentPlaceholders: true,
  declarationAccepted: true,
  privacyAccepted: true,
  contactConsentAccepted: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reviews: { orderBy: { createdAt: "desc" }, take: 5 },
  statusHistory: { orderBy: { createdAt: "desc" }, take: 10 }
} satisfies Prisma.VendorApplicationSelect;

@Injectable()
export class VendorApplicationsService {
  constructor(private readonly prisma: PrismaService, private readonly applicationNotifications: ApplicationNotificationsService) {}

  async create(dto: CreateVendorApplicationDto) {
    if (!dto.declarationAccepted || !dto.privacyAccepted || !dto.contactConsentAccepted) {
      throw new BadRequestException("Application declaration, privacy acknowledgement and contact consent are required");
    }
    this.assertKanoPilotLocation(dto);
    const businessPhoneNumber = this.normalizePhone(dto.businessPhoneNumber);
    const contactPhoneNumber = this.normalizePhone(dto.contactPhoneNumber);

    const data: Prisma.VendorApplicationCreateInput = {
        businessCategory: dto.businessCategory,
        businessName: dto.businessName,
        tradingName: dto.tradingName,
        businessType: dto.businessType,
        businessDescription: dto.businessDescription,
        businessAddress: dto.businessAddress,
        state: dto.state,
        city: dto.city,
        area: dto.area,
        serviceAreas: this.json(dto.serviceAreas),
        operatingHours: dto.operatingHours,
        businessPhoneNumber,
        businessEmail: dto.businessEmail,
        websiteOrSocialLink: dto.websiteOrSocialLink,
        contactFullName: dto.contactFullName,
        contactRole: dto.contactRole,
        contactPhoneNumber,
        contactEmail: dto.contactEmail,
        preferredContactMethod: dto.preferredContactMethod,
        deliveryReadiness: dto.deliveryReadiness,
        deliveryPreference: dto.deliveryPreference,
        averagePreparationTime: dto.averagePreparationTime,
        numberOfStaff: dto.numberOfStaff,
        catalogueCategory: dto.catalogueCategory,
        estimatedCatalogueSize: dto.estimatedCatalogueSize,
        existingDelivery: dto.existingDelivery,
        brandAssets: this.json(dto.brandAssets),
        documentPlaceholders: this.json(dto.documentPlaceholders),
        declarationAccepted: dto.declarationAccepted,
        privacyAccepted: dto.privacyAccepted,
        contactConsentAccepted: dto.contactConsentAccepted,
        reference: await this.nextReference(),
        status: VendorApplicationStatus.SUBMITTED,
        statusHistory: {
          create: {
            toStatus: VendorApplicationStatus.SUBMITTED,
            note: "Public vendor application submitted"
          }
        }
      };

    const application = await this.prisma.vendorApplication.create({
      data,
      select: APPLICATION_SELECT
    });
    await this.applicationNotifications.vendorApplicationSubmitted({
      reference: application.reference,
      recipientName: application.contactFullName,
      phoneNumber: application.contactPhoneNumber,
      email: application.contactEmail
    });

    return this.toPublicStatus(application);
  }

  async publicStatus(query: VendorApplicationStatusQueryDto) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: {
        reference: query.reference,
        OR: [
          { businessEmail: { equals: query.email, mode: "insensitive" } },
          { contactEmail: { equals: query.email, mode: "insensitive" } }
        ]
      },
      select: APPLICATION_SELECT
    });

    if (!application) {
      throw new NotFoundException("Application status could not be found for the supplied details");
    }

    return this.toPublicStatus(application);
  }

  async list(status?: VendorApplicationStatus) {
    const applications = await this.prisma.vendorApplication.findMany({
      where: status ? { status } : {},
      select: APPLICATION_SELECT,
      orderBy: { submittedAt: "desc" },
      take: 100
    });
    return applications.map((application) => this.toAdminDetail(application));
  }

  async detail(applicationId: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!application) throw new NotFoundException("Vendor application not found");
    return this.toAdminDetail(application);
  }

  async review(applicationId: string, reviewerId: string, dto: ReviewVendorApplicationDto) {
    const current = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true }
    });
    if (!current) throw new NotFoundException("Vendor application not found");

    const application = await this.prisma.$transaction(async (tx) => {
      await tx.vendorApplicationReview.create({
        data: {
          applicationId,
          reviewerId,
          status: dto.status,
          notes: dto.notes,
          checklist: this.json(dto.checklist)
        }
      });
      await tx.vendorApplicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: current.status,
          toStatus: dto.status,
          note: dto.notes,
          changedById: reviewerId
        }
      });
      return tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          reviewedAt: new Date()
        },
        select: APPLICATION_SELECT
      });
    });

    await this.applicationNotifications.vendorApplicationReviewed({
      reference: application.reference,
      recipientName: application.contactFullName,
      phoneNumber: application.contactPhoneNumber,
      email: application.contactEmail,
      status: application.status
    });

    return this.toAdminDetail(application);
  }

  private async nextReference(): Promise<string> {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const reference = `KGO-APP-${new Date().getFullYear()}-${suffix}`;
    const exists = await this.prisma.vendorApplication.findUnique({ where: { reference }, select: { id: true } });
    return exists ? this.nextReference() : reference;
  }

  private normalizePhone(phoneNumber: string) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!NIGERIAN_PHONE_PATTERN.test(normalized)) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }
    return normalized;
  }

  private toPublicStatus(application: Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>) {
    return {
      reference: application.reference,
      businessName: application.businessName,
      businessCategory: application.businessCategory,
      status: application.status,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      message: this.statusMessage(application.status)
    };
  }

  private toAdminDetail(application: Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>) {
    return {
      ...application,
      submittedAt: application.submittedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      reviews: application.reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() })),
      statusHistory: application.statusHistory.map((history) => ({ ...history, createdAt: history.createdAt.toISOString() }))
    };
  }

  private json(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : value as Prisma.InputJsonValue;
  }

  private assertKanoPilotLocation(dto: Pick<CreateVendorApplicationDto, "city" | "state">) {
    if (dto.state !== "Kano" || dto.city !== "Kano") {
      throw new BadRequestException("KariGO vendor applications are currently limited to Kano for the controlled pilot.");
    }
  }

  private statusMessage(status: VendorApplicationStatus) {
    const messages: Record<VendorApplicationStatus, string> = {
      DRAFT: "Your application has not been submitted yet.",
      SUBMITTED: "Your application has been received and is waiting for review.",
      UNDER_REVIEW: "Your application is under review by KariGO.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing the review.",
      PROVISIONALLY_APPROVED: "Your application is provisionally approved. Final setup steps are still required.",
      APPROVED: "Your application has been approved. Storefront publication still requires setup and marketplace visibility review.",
      REJECTED: "Your application was not approved at this time.",
      SUSPENDED: "This application is suspended pending further review.",
      WITHDRAWN: "This application has been withdrawn."
    };
    return messages[status];
  }
}
