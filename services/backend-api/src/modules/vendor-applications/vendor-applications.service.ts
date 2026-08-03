import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Prisma, UserRole, VendorActivationInvitationStatus, VendorApplicationStatus, VendorStatus } from "@prisma/client";
import { hash } from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { PartnerOnboardingDraftDto } from "./dto/partner-onboarding-draft.dto";
import { ReviewVendorApplicationDto } from "./dto/review-vendor-application.dto";
import { VendorApplicationStatusQueryDto } from "./dto/vendor-application-status-query.dto";

const APPLICATION_SELECT = {
  id: true,
  reference: true,
  applicantUserId: true,
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
  deletedAt: true,
  trashReason: true,
  trashNote: true,
  trashedByAdminId: true,
  restoredAt: true,
  restoredByAdminId: true,
  vendorId: true,
  createdAt: true,
  updatedAt: true,
  applicant: {
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      email: true,
      accountStatus: true,
      phoneVerified: true,
      onboardingPasswordSetAt: true
    }
  },
  reviews: { orderBy: { createdAt: "desc" }, take: 5 },
  statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
  documents: { orderBy: { uploadedAt: "desc" } },
  vendor: {
    select: {
      id: true,
      businessName: true,
      status: true,
      deletedAt: true,
      user: { select: { id: true, accountStatus: true, email: true, phoneNumber: true } },
      activationInvitations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true }
      }
    }
  }
} satisfies Prisma.VendorApplicationSelect;

const PARTNER_DRAFT_SELECT = {
  id: true,
  userId: true,
  applicationId: true,
  onboardingStage: true,
  accountType: true,
  draftData: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.PartnerOnboardingDraftSelect;

type SelectedVendorApplication = Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>;

@Injectable()
export class VendorApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationNotifications: ApplicationNotificationsService,
    private readonly config?: ConfigService
  ) {}

  async create(dto: CreateVendorApplicationDto) {
    if (!dto.declarationAccepted || !dto.privacyAccepted || !dto.contactConsentAccepted) {
      throw new BadRequestException("Application declaration, privacy acknowledgement and contact consent are required");
    }
    this.assertLaunchLocation(dto);
    const businessPhoneNumber = this.normalizePhone(dto.businessPhoneNumber);
    const contactPhoneNumber = this.normalizePhone(dto.contactPhoneNumber);
    const applicant = await this.requireApplicantAccount(contactPhoneNumber);
    await this.assertNoActiveDuplicateApplication(applicant.id, contactPhoneNumber);

    const data: Prisma.VendorApplicationCreateInput = {
        applicant: { connect: { id: applicant.id } },
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
        documents: dto.documents?.length ? {
          create: dto.documents.map((document) => ({
            documentType: document.documentType,
            documentName: document.documentName,
            documentUrl: document.documentUrl
          }))
        } : undefined,
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

  async currentUserPartnerStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        accountStatus: true,
        phoneVerified: true,
        deletedAt: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            deletedAt: true
          }
        },
        partnerOnboardingDraft: { select: PARTNER_DRAFT_SELECT }
      }
    });
    if (!user || user.deletedAt) throw new NotFoundException("KariGO account not found");
    if (
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.BLOCKED ||
      user.accountStatus === AccountStatus.DEACTIVATED
    ) {
      return {
        authenticated: true,
        state: "restricted",
        account: this.partnerAccountSummary(user),
        onboardingStage: user.partnerOnboardingDraft?.onboardingStage ?? null,
        nextRoute: "/",
        message: "This KariGO account is restricted. Contact KariGO support before continuing Partner onboarding."
      };
    }

    if (user.vendor && !user.vendor.deletedAt) {
      return {
        authenticated: true,
        state: user.vendor.status === VendorStatus.SUSPENDED || user.vendor.status === VendorStatus.CLOSED ? "restricted" : "approved",
        account: this.partnerAccountSummary(user),
        partnerProfile: user.vendor,
        onboardingStage: user.partnerOnboardingDraft?.onboardingStage ?? "SUBMITTED",
        nextRoute: "/",
        message: user.vendor.status === VendorStatus.SUSPENDED || user.vendor.status === VendorStatus.CLOSED
          ? "This Partner profile is restricted. Contact KariGO support for help."
          : "Approved Partner profile found. Open the Partner Workspace."
      };
    }

    const application = await this.prisma.vendorApplication.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { applicantUserId: user.id },
          { contactPhoneNumber: user.phoneNumber },
          ...(user.email ? [{ contactEmail: { equals: user.email, mode: "insensitive" as const } }] : [])
        ]
      },
      select: APPLICATION_SELECT,
      orderBy: { createdAt: "desc" }
    });

    if (application) {
      return {
        authenticated: true,
        state: this.partnerApplicationState(application.status),
        account: this.partnerAccountSummary(user),
        application: this.toPublicStatus(application),
        correctionNote: application.reviews[0]?.notes ?? null,
        onboardingStage: user.partnerOnboardingDraft?.onboardingStage ?? "SUBMITTED",
        nextRoute: "/",
        message: this.statusMessage(application.status)
      };
    }

    return {
      authenticated: true,
      state: "application_not_started",
      account: this.partnerAccountSummary(user),
      onboardingStage: user.partnerOnboardingDraft?.onboardingStage ?? "START",
      nextRoute: this.nextRouteForStage(user.partnerOnboardingDraft?.onboardingStage ?? "START"),
      draft: user.partnerOnboardingDraft ? this.toPartnerDraftPublic(user.partnerOnboardingDraft) : null,
      message: "Your KariGO account has been recognised. Continue to create your Partner profile."
    };
  }

  async ensurePartnerApplicant(userId: string) {
    const user = await this.loadPartnerOnboardingUser(userId);
    this.assertPartnerOnboardingAccount(user);

    const application = await this.findCurrentUserApplication(this.prisma, user);
    const stage = application ? "SUBMITTED" : "START";
    const draft = await this.prisma.partnerOnboardingDraft.upsert({
      where: { userId },
      update: {
        ...(application ? { applicationId: application.id, onboardingStage: "SUBMITTED", submittedAt: application.submittedAt } : {})
      },
      create: {
        userId,
        ...(application ? { applicationId: application.id, onboardingStage: "SUBMITTED", submittedAt: application.submittedAt } : { onboardingStage: stage })
      },
      select: PARTNER_DRAFT_SELECT
    });

    return this.toPartnerOnboardingResult(user, draft, application);
  }

  async savePartnerOnboardingDraft(userId: string, dto: PartnerOnboardingDraftDto) {
    const user = await this.loadPartnerOnboardingUser(userId);
    this.assertPartnerOnboardingAccount(user);
    const application = await this.findCurrentUserApplication(this.prisma, user);
    const requestedStage = dto.onboardingStage ?? (application ? "SUBMITTED" : "START");
    const stage = application && requestedStage !== "SUBMITTED" ? "SUBMITTED" : requestedStage;

    const draft = await this.prisma.partnerOnboardingDraft.upsert({
      where: { userId },
      update: {
        onboardingStage: stage,
        ...(dto.accountType !== undefined ? { accountType: dto.accountType } : {}),
        ...(dto.draftData !== undefined ? { draftData: this.json(dto.draftData) } : {}),
        ...(application ? { applicationId: application.id, submittedAt: application.submittedAt } : {})
      },
      create: {
        userId,
        onboardingStage: stage,
        accountType: dto.accountType,
        draftData: this.json(dto.draftData),
        ...(application ? { applicationId: application.id, submittedAt: application.submittedAt } : {})
      },
      select: PARTNER_DRAFT_SELECT
    });

    return this.toPartnerOnboardingResult(user, draft, application);
  }

  async submitForCurrentUser(userId: string, dto: CreateVendorApplicationDto) {
    if (!dto.declarationAccepted || !dto.privacyAccepted || !dto.contactConsentAccepted) {
      throw new BadRequestException("Application declaration, privacy acknowledgement and contact consent are required");
    }
    this.assertLaunchLocation(dto);

    const user = await this.loadPartnerOnboardingUser(userId);
    this.assertPartnerOnboardingAccount(user);
    const businessPhoneNumber = this.normalizePhone(dto.businessPhoneNumber);
    const contactPhoneNumber = this.normalizePhone(dto.contactPhoneNumber || user.phoneNumber);
    const reference = await this.nextReference();

    const { application, createdForNotification } = await this.prisma.$transaction(async (tx): Promise<{
      application: SelectedVendorApplication;
      createdForNotification: SelectedVendorApplication | null;
    }> => {
      const draft = await tx.partnerOnboardingDraft.upsert({
        where: { userId },
        update: {
          onboardingStage: "REVIEW",
          accountType: dto.businessType ?? dto.catalogueCategory,
          draftData: this.json(this.safeDraftDataFromApplicationDto(dto))
        },
        create: {
          userId,
          onboardingStage: "REVIEW",
          accountType: dto.businessType ?? dto.catalogueCategory,
          draftData: this.json(this.safeDraftDataFromApplicationDto(dto))
        },
        select: PARTNER_DRAFT_SELECT
      });

      if (draft.applicationId) {
        const existingByDraft = await tx.vendorApplication.findUnique({
          where: { id: draft.applicationId },
          select: APPLICATION_SELECT
        });
        if (existingByDraft && !existingByDraft.deletedAt) {
          return { application: existingByDraft, createdForNotification: null };
        }
      }

      const existing = await this.findCurrentUserApplication(tx, user, contactPhoneNumber, dto.contactEmail);
      if (existing) {
        await tx.partnerOnboardingDraft.update({
          where: { userId },
          data: {
            applicationId: existing.id,
            onboardingStage: "SUBMITTED",
            submittedAt: existing.submittedAt
          }
        });
        return { application: existing, createdForNotification: null };
      }

      const created = await tx.vendorApplication.create({
        data: this.vendorApplicationCreateData(dto, user.id, businessPhoneNumber, contactPhoneNumber, reference),
        select: APPLICATION_SELECT
      });
      await tx.partnerOnboardingDraft.update({
        where: { userId },
        data: {
          applicationId: created.id,
          onboardingStage: "SUBMITTED",
          submittedAt: created.submittedAt
        }
      });
      return { application: created, createdForNotification: created };
    });

    if (createdForNotification) {
      await this.applicationNotifications.vendorApplicationSubmitted({
        reference: createdForNotification.reference,
        recipientName: createdForNotification.contactFullName,
        phoneNumber: createdForNotification.contactPhoneNumber,
        email: createdForNotification.contactEmail
      });
    }

    return {
      ...this.toPublicStatus(application),
      alreadySubmitted: !createdForNotification,
      message: createdForNotification
        ? this.statusMessage(application.status)
        : "Your Partner application has already been submitted."
    };
  }

  async list(status?: VendorApplicationStatus, trash: "active" | "trashed" | "all" = "active") {
    const trashFilter = trash === "trashed" || trash === "all" ? trash : "active";
    const where: Prisma.VendorApplicationWhereInput = {
      ...(status ? { status } : {}),
      ...(trashFilter === "trashed" ? { deletedAt: { not: null } } : trashFilter === "all" ? {} : { deletedAt: null })
    };
    const applications = await this.prisma.vendorApplication.findMany({
      where,
      select: APPLICATION_SELECT,
      orderBy: trashFilter === "trashed" ? { deletedAt: "desc" } : { submittedAt: "desc" },
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
      select: APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Vendor application not found");
    if (current.deletedAt) throw new BadRequestException("Trashed vendor applications must be restored before review.");
    if (current.status === dto.status) throw new BadRequestException(`Vendor application is already ${dto.status.replaceAll("_", " ")}.`);
    if (dto.status === VendorApplicationStatus.REJECTED && !dto.notes?.trim()) {
      throw new BadRequestException("Rejecting a vendor application requires a reason.");
    }

    const shouldApprove = dto.status === VendorApplicationStatus.APPROVED;
    const activationToken = shouldApprove ? randomBytes(40).toString("base64url") : null;
    const activationExpiresAt = shouldApprove ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;
    const placeholderPasswordHash = shouldApprove ? await hash(randomBytes(32).toString("hex"), 12) : null;
    let activationUrl: string | null = null;
    let activationExpiresAtText: string | null = null;

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
      await tx.adminAuditLog.create({
        data: {
          adminUserId: reviewerId,
          action: "admin.vendor_application.reviewed",
          entityType: "VendorApplication",
          entityId: applicationId,
          newValue: {
            applicationReference: current.reference,
            businessName: current.businessName,
            previousStatus: current.status,
            newStatus: dto.status,
            hasReason: Boolean(dto.notes?.trim()),
            operationalGuardrail: "Approval does not activate payouts, pharmacy marketplace, or unrestricted public operations."
          } as Prisma.InputJsonValue
        }
      });
      const linkedVendor = shouldApprove
        ? await this.ensureVendorAccountForApplication(tx, current, reviewerId, placeholderPasswordHash ?? "")
        : null;
      if (linkedVendor && activationToken && activationExpiresAt && linkedVendor.userAccountStatus !== AccountStatus.ACTIVE && !linkedVendor.passwordCreated) {
        await tx.vendorAccountActivation.updateMany({
          where: { vendorId: linkedVendor.vendorId, status: VendorActivationInvitationStatus.PENDING },
          data: { status: VendorActivationInvitationStatus.REVOKED, revokedAt: new Date() }
        });
        await tx.vendorAccountActivation.create({
          data: {
            vendorId: linkedVendor.vendorId,
            userId: linkedVendor.userId,
            tokenHash: this.hashSecret(activationToken),
            expiresAt: activationExpiresAt,
            createdByAdminId: reviewerId
          }
        });
        await tx.vendorAuditLog.create({
          data: {
            vendorId: linkedVendor.vendorId,
            actorUserId: reviewerId,
            action: "vendor.application.approved.activation_link_created",
            entityType: "VendorApplication",
            entityId: applicationId,
            newValue: {
              applicationReference: current.reference,
              activationExpiresAt: activationExpiresAt.toISOString()
            } as Prisma.InputJsonValue
          }
        });
        activationUrl = `${this.vendorDashboardUrl()}/activate?token=${encodeURIComponent(activationToken)}`;
        activationExpiresAtText = activationExpiresAt.toISOString();
      }
      return tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          reviewedAt: new Date(),
          ...(linkedVendor ? { vendorId: linkedVendor.vendorId } : {})
        },
        select: APPLICATION_SELECT
      });
    });

    await this.applicationNotifications.vendorApplicationReviewed({
      reference: application.reference,
      recipientName: application.contactFullName,
      phoneNumber: application.contactPhoneNumber,
      email: application.contactEmail,
      status: application.status,
      activationUrl,
      activationExpiresAt: activationExpiresAtText
    });

    return this.toAdminDetail(application);
  }

  async trash(applicationId: string, adminUserId: string, reason: string, note?: string) {
    const current = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Vendor application not found");
    if (current.deletedAt) return this.toAdminDetail(current);

    const deletedAt = new Date();
    const application = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          deletedAt,
          trashReason: reason,
          trashNote: note,
          trashedByAdminId: adminUserId,
          restoredAt: null,
          restoredByAdminId: null
        },
        select: APPLICATION_SELECT
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin.vendor_application.trash",
          entityType: "VendorApplication",
          entityId: applicationId,
          newValue: {
            applicationReference: current.reference,
            businessName: current.businessName,
            reason,
            note: note ?? null
          } as Prisma.InputJsonValue
        }
      });
      return updated;
    });

    return this.toAdminDetail(application);
  }

  async restore(applicationId: string, adminUserId: string, reason?: string) {
    const current = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Vendor application not found");
    if (!current.deletedAt) return this.toAdminDetail(current);

    const application = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          deletedAt: null,
          restoredAt: new Date(),
          restoredByAdminId: adminUserId
        },
        select: APPLICATION_SELECT
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin.vendor_application.restore",
          entityType: "VendorApplication",
          entityId: applicationId,
          newValue: {
            applicationReference: current.reference,
            businessName: current.businessName,
            reason: reason ?? null
          } as Prisma.InputJsonValue
        }
      });
      return updated;
    });

    return this.toAdminDetail(application);
  }

  async permanentlyDelete(applicationId: string, adminUserId: string, confirmation: "DELETE" | "PERMANENTLY DELETE") {
    if (confirmation !== "DELETE" && confirmation !== "PERMANENTLY DELETE") {
      throw new BadRequestException("Type DELETE to permanently delete this vendor application.");
    }
    const current = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Vendor application not found");

    const safety = await this.permanentDeleteSafety(current);
    if (!safety.canPermanentlyDelete) {
      throw new BadRequestException({
        message: "This record cannot be permanently deleted because it has linked operational or financial history. You may keep it in Trash instead.",
        details: safety
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vendorApplicationDocument.deleteMany({ where: { applicationId } });
      await tx.vendorApplicationReview.deleteMany({ where: { applicationId } });
      await tx.vendorApplicationStatusHistory.deleteMany({ where: { applicationId } });
      await tx.vendorApplication.delete({ where: { id: applicationId } });
      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action: "admin.vendor_application.permanent_delete",
          entityType: "VendorApplication",
          entityId: applicationId,
          newValue: {
            applicationReference: current.reference,
            businessName: current.businessName,
            cleanupSafety: safety
          } as Prisma.InputJsonValue
        }
      });
    });

    return { applicationId, permanentlyDeleted: true };
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
      deletedAt: application.deletedAt?.toISOString() ?? null,
      restoredAt: application.restoredAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      inTrash: Boolean(application.deletedAt),
      reviews: application.reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() })),
      statusHistory: application.statusHistory.map((history) => ({ ...history, createdAt: history.createdAt.toISOString() })),
      documents: (application.documents ?? []).map((document) => ({
        ...document,
        uploadedAt: document.uploadedAt.toISOString(),
        verifiedAt: document.verifiedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      }))
    };
  }

  private json(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : value as Prisma.InputJsonValue;
  }

  private async loadPartnerOnboardingUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        accountStatus: true,
        phoneVerified: true,
        deletedAt: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            deletedAt: true
          }
        }
      }
    });
    if (!user || user.deletedAt) throw new NotFoundException("KariGO account not found");
    return user;
  }

  private assertPartnerOnboardingAccount(user: Awaited<ReturnType<VendorApplicationsService["loadPartnerOnboardingUser"]>>) {
    const allowedRoles: UserRole[] = [UserRole.CUSTOMER, UserRole.RIDER, UserRole.VENDOR];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException("This KariGO account cannot continue Partner onboarding.");
    }
    if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified) {
      throw new BadRequestException("Sign in with an active verified KariGO account before continuing Partner onboarding.");
    }
  }

  private async findCurrentUserApplication(
    tx: Prisma.TransactionClient | PrismaService,
    user: Pick<Awaited<ReturnType<VendorApplicationsService["loadPartnerOnboardingUser"]>>, "id" | "phoneNumber" | "email">,
    contactPhoneNumber?: string,
    contactEmail?: string
  ) {
    return tx.vendorApplication.findFirst({
      where: {
        deletedAt: null,
        status: { notIn: [VendorApplicationStatus.REJECTED, VendorApplicationStatus.WITHDRAWN] },
        OR: [
          { applicantUserId: user.id },
          { contactPhoneNumber: contactPhoneNumber ?? user.phoneNumber },
          { businessPhoneNumber: contactPhoneNumber ?? user.phoneNumber },
          ...(user.email ? [
            { contactEmail: { equals: user.email, mode: "insensitive" as const } },
            { businessEmail: { equals: user.email, mode: "insensitive" as const } }
          ] : []),
          ...(contactEmail ? [
            { contactEmail: { equals: contactEmail, mode: "insensitive" as const } },
            { businessEmail: { equals: contactEmail, mode: "insensitive" as const } }
          ] : [])
        ]
      },
      select: APPLICATION_SELECT,
      orderBy: { createdAt: "desc" }
    });
  }

  private vendorApplicationCreateData(
    dto: CreateVendorApplicationDto,
    applicantUserId: string,
    businessPhoneNumber: string,
    contactPhoneNumber: string,
    reference: string
  ): Prisma.VendorApplicationCreateInput {
    return {
      applicant: { connect: { id: applicantUserId } },
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
      documents: dto.documents?.length ? {
        create: dto.documents.map((document) => ({
          documentType: document.documentType,
          documentName: document.documentName,
          documentUrl: document.documentUrl
        }))
      } : undefined,
      declarationAccepted: dto.declarationAccepted,
      privacyAccepted: dto.privacyAccepted,
      contactConsentAccepted: dto.contactConsentAccepted,
      reference,
      status: VendorApplicationStatus.SUBMITTED,
      statusHistory: {
        create: {
          toStatus: VendorApplicationStatus.SUBMITTED,
          note: "Partner application submitted"
        }
      }
    };
  }

  private safeDraftDataFromApplicationDto(dto: CreateVendorApplicationDto) {
    const { documents, ...safe } = dto;
    return {
      ...safe,
      hasDocuments: Boolean(documents?.length)
    };
  }

  private toPartnerDraftPublic(draft: Prisma.PartnerOnboardingDraftGetPayload<{ select: typeof PARTNER_DRAFT_SELECT }>) {
    return {
      id: draft.id,
      onboardingStage: draft.onboardingStage,
      accountType: draft.accountType,
      draftData: draft.draftData ?? null,
      applicationId: draft.applicationId,
      submittedAt: draft.submittedAt?.toISOString() ?? null,
      updatedAt: draft.updatedAt.toISOString()
    };
  }

  private toPartnerOnboardingResult(
    user: Awaited<ReturnType<VendorApplicationsService["loadPartnerOnboardingUser"]>>,
    draft: Prisma.PartnerOnboardingDraftGetPayload<{ select: typeof PARTNER_DRAFT_SELECT }>,
    application?: Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }> | null
  ) {
    const applicationState = application ? this.partnerApplicationState(application.status) : "application_in_progress";
    const canEdit = !application || application.status === VendorApplicationStatus.DRAFT || application.status === VendorApplicationStatus.CHANGES_REQUESTED;
    return {
      authenticated: true,
      userId: user.id,
      partnerApplicantId: user.id,
      partnerProfileId: user.vendor && !user.vendor.deletedAt ? user.vendor.id : application?.vendorId ?? null,
      applicationId: application?.id ?? draft.applicationId ?? null,
      applicationReference: application?.reference ?? null,
      applicationStatus: application?.status ?? null,
      state: user.vendor && !user.vendor.deletedAt ? "approved" : applicationState,
      onboardingStage: application ? "SUBMITTED" : draft.onboardingStage,
      canEdit,
      canSubmit: canEdit,
      nextRoute: application ? "/" : this.nextRouteForStage(draft.onboardingStage),
      account: this.partnerAccountSummary(user),
      partnerProfile: user.vendor && !user.vendor.deletedAt ? user.vendor : null,
      application: application ? this.toPublicStatus(application) : null,
      draft: this.toPartnerDraftPublic(draft),
      message: application ? this.statusMessage(application.status) : "Continue Partner onboarding with your KariGO account."
    };
  }

  private nextRouteForStage(stage: string) {
    const routes: Record<string, string> = {
      START: "/register",
      ACCOUNT_TYPE: "/register/account-type",
      BUSINESS: "/register/business",
      OPERATIONS: "/register/service-details",
      DOCUMENTS: "/register/documents",
      REVIEW: "/register/review",
      SUBMITTED: "/"
    };
    return routes[stage] ?? "/register";
  }

  private async ensureVendorAccountForApplication(
    tx: Prisma.TransactionClient,
    application: Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>,
    reviewerId: string,
    placeholderPasswordHash: string
  ) {
    if (application.vendorId && application.vendor) {
      return {
        vendorId: application.vendor.id,
        userId: application.vendor.user.id,
        userAccountStatus: application.vendor.user.accountStatus
      };
    }

    const existingUser = await tx.user.findFirst({
      where: application.applicantUserId
        ? { id: application.applicantUserId }
        : {
          OR: [
            { phoneNumber: application.contactPhoneNumber },
            { email: { equals: application.contactEmail, mode: "insensitive" } }
          ]
        },
      select: { id: true, role: true, accountStatus: true, email: true, phoneNumber: true, vendor: { select: { id: true } } }
    });

    const user = existingUser ?? await tx.user.create({
      data: {
        fullName: application.contactFullName,
        phoneNumber: application.contactPhoneNumber,
        email: application.contactEmail,
        passwordHash: placeholderPasswordHash,
        role: UserRole.VENDOR,
        accountStatus: AccountStatus.PENDING,
        phoneVerified: false,
        emailVerified: false
      },
      select: { id: true, role: true, accountStatus: true, email: true, phoneNumber: true, vendor: { select: { id: true } } }
    });

    if (user.vendor) {
      if (user.accountStatus !== AccountStatus.ACTIVE && application.applicant?.phoneVerified && application.applicant.onboardingPasswordSetAt) {
        await tx.user.update({ where: { id: user.id }, data: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true } });
      }
      await tx.vendorApplication.update({
        where: { id: application.id },
        data: { vendorId: user.vendor.id }
      });
      return {
        vendorId: user.vendor.id,
        userId: user.id,
        userAccountStatus: application.applicant?.onboardingPasswordSetAt && application.applicant.phoneVerified ? AccountStatus.ACTIVE : user.accountStatus,
        passwordCreated: Boolean(application.applicant?.onboardingPasswordSetAt)
      };
    }

    const vendor = await tx.vendor.create({
      data: {
        userId: user.id,
        businessName: application.tradingName || application.businessName,
        businessCategory: application.businessCategory,
        description: application.businessDescription,
        phoneNumber: application.businessPhoneNumber,
        email: application.businessEmail,
        address: application.businessAddress,
        city: application.city,
        state: application.state,
        status: VendorStatus.PENDING_APPROVAL,
        isOpen: false,
        branches: {
          create: {
            name: "Main branch",
            address: application.businessAddress,
            city: application.city,
            state: application.state,
            area: application.area,
            phoneNumber: application.businessPhoneNumber,
            isPrimary: true
          }
        },
        auditLogs: {
          create: {
            actorUserId: reviewerId,
            action: "vendor.created_from_application",
            entityType: "VendorApplication",
            entityId: application.id,
            newValue: {
              applicationReference: application.reference,
              initialStatus: VendorStatus.PENDING_APPROVAL
            } as Prisma.InputJsonValue
          }
        }
      },
      select: { id: true, userId: true }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: reviewerId,
        action: "admin.vendor_application.approved.vendor_created",
        entityType: "VendorApplication",
        entityId: application.id,
        newValue: {
          vendorId: vendor.id,
          applicationReference: application.reference,
          businessName: application.businessName
        } as Prisma.InputJsonValue
      }
    });

    if (user.accountStatus !== AccountStatus.ACTIVE && application.applicant?.phoneVerified && application.applicant.onboardingPasswordSetAt) {
      await tx.user.update({ where: { id: user.id }, data: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true } });
    }

    return {
      vendorId: vendor.id,
      userId: vendor.userId,
      userAccountStatus: application.applicant?.onboardingPasswordSetAt && application.applicant.phoneVerified ? AccountStatus.ACTIVE : user.accountStatus,
      passwordCreated: Boolean(application.applicant?.onboardingPasswordSetAt)
    };
  }

  private async requireApplicantAccount(phoneNumber: string) {
    const applicant = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        phoneVerified: true,
        onboardingPasswordSetAt: true,
        deletedAt: true
      }
    });
    if (!applicant || applicant.deletedAt) {
      throw new BadRequestException("Sign in with your KariGO account before submitting a Partner application.");
    }
    if (applicant.role === UserRole.CUSTOMER || applicant.role === UserRole.RIDER) {
      if (!applicant.phoneVerified || applicant.accountStatus !== AccountStatus.ACTIVE) {
        throw new BadRequestException("Sign in with an active verified KariGO account before continuing Partner onboarding.");
      }
      return applicant;
    }
    if (applicant.role !== UserRole.VENDOR) {
      throw new BadRequestException("This KariGO account is not eligible for Partner onboarding.");
    }
    if (!applicant.phoneVerified) {
      throw new BadRequestException("Verify the Vendor applicant phone number before submitting the application.");
    }
    if (!applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Create the Vendor applicant password before submitting the application.");
    }
    return applicant;
  }

  private async assertNoActiveDuplicateApplication(applicantUserId: string, contactPhoneNumber: string) {
    const duplicate = await this.prisma.vendorApplication.findFirst({
      where: {
        deletedAt: null,
        status: { notIn: [VendorApplicationStatus.REJECTED, VendorApplicationStatus.WITHDRAWN] },
        OR: [
          { applicantUserId },
          { contactPhoneNumber }
        ]
      },
      select: { reference: true, status: true }
    });
    if (duplicate) {
      throw new BadRequestException(`A vendor application is already active for this account (${duplicate.reference}, ${duplicate.status}).`);
    }
  }

  private vendorDashboardUrl() {
    return (this.config?.get<string>("VENDOR_DASHBOARD_URL")
      ?? this.config?.get<string>("VENDOR_PORTAL_URL")
      ?? "https://vendor.karigo.com.ng").replace(/\/+$/, "");
  }

  private hashSecret(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private assertLaunchLocation(dto: Pick<CreateVendorApplicationDto, "city" | "state">) {
    const city = dto.city.trim().toLowerCase();
    const state = dto.state.trim().toLowerCase();
    const supported = (city === "kano" && state === "kano") || (city === "abuja" && state === "fct");
    if (!supported) {
      throw new BadRequestException("KariGO vendor applications are currently open for Kano and Abuja launch onboarding.");
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

  private partnerApplicationState(status: VendorApplicationStatus) {
    const states: Record<VendorApplicationStatus, string> = {
      DRAFT: "application_in_progress",
      SUBMITTED: "application_submitted",
      UNDER_REVIEW: "application_submitted",
      CHANGES_REQUESTED: "correction_required",
      PROVISIONALLY_APPROVED: "application_submitted",
      APPROVED: "approved",
      REJECTED: "rejected",
      SUSPENDED: "restricted",
      WITHDRAWN: "application_not_started"
    };
    return states[status];
  }

  private partnerAccountSummary(user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    role: UserRole;
    accountStatus: AccountStatus;
    phoneVerified: boolean;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      phoneVerified: user.phoneVerified
    };
  }

  private async permanentDeleteSafety(application: Prisma.VendorApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>) {
    const vendorId = application.vendorId;
    const [orders, settlements, payoutAccounts, orderItems, payments, documents, reviews, history] = await Promise.all([
      vendorId ? this.prisma.order.count({ where: { vendorId } }) : Promise.resolve(0),
      vendorId ? this.prisma.vendorSettlement.count({ where: { vendorId } }) : Promise.resolve(0),
      vendorId ? this.prisma.vendorPayoutAccount.count({ where: { vendorId } }) : Promise.resolve(0),
      vendorId ? this.prisma.orderItem.count({ where: { product: { vendorId } } }) : Promise.resolve(0),
      vendorId ? this.prisma.payment.count({ where: { order: { is: { vendorId } } } }) : Promise.resolve(0),
      this.prisma.vendorApplicationDocument.count({ where: { applicationId: application.id } }),
      this.prisma.vendorApplicationReview.count({ where: { applicationId: application.id } }),
      this.prisma.vendorApplicationStatusHistory.count({ where: { applicationId: application.id } })
    ]);

    const protectedRecordCounts = { orders, settlements, payoutAccounts, orderItems, payments };
    const activeApprovedVendorProfile = Boolean(application.vendor && !application.vendor.deletedAt);
    const blockedBy = [
      ...(!application.deletedAt ? ["Application must be moved to Trash before permanent deletion."] : []),
      ...(activeApprovedVendorProfile ? ["Application is linked to an active partner/vendor profile."] : []),
      ...(orders ? ["Linked vendor has order history."] : []),
      ...(settlements ? ["Linked vendor has settlement history."] : []),
      ...(payoutAccounts ? ["Linked vendor has payout account records."] : []),
      ...(orderItems ? ["Linked vendor products are tied to historical order items."] : []),
      ...(payments ? ["Linked vendor orders have payment records."] : [])
    ];

    return {
      canPermanentlyDelete: blockedBy.length === 0,
      blockedBy,
      protectedRecordCounts,
      removableApplicationRecords: { documents, reviews, history }
    };
  }
}
