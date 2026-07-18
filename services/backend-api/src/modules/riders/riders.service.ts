import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, DeliveryCaptainApplicationStatus, Prisma, RiderStatus, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { CreateDeliveryCaptainApplicationDto } from "./dto/create-delivery-captain-application.dto";
import { DeliveryCaptainApplicationStatusQueryDto } from "./dto/delivery-captain-application-status-query.dto";
import { ListDeliveryCaptainApplicationsQueryDto } from "./dto/list-delivery-captain-applications-query.dto";
import { ReviewDeliveryCaptainApplicationDto } from "./dto/review-delivery-captain-application.dto";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";

const DELIVERY_CAPTAIN_APPLICATION_SELECT = {
  id: true,
  applicationReference: true,
  applicantUserId: true,
  fullName: true,
  phoneNumber: true,
  email: true,
  city: true,
  state: true,
  address: true,
  preferredZone: true,
  vehicleType: true,
  vehiclePlateNumber: true,
  driverLicenceNumber: true,
  riderExperience: true,
  profilePhotoUrl: true,
  guarantorName: true,
  guarantorPhone: true,
  notes: true,
  status: true,
  adminNote: true,
  applicantVisibleNote: true,
  reviewedAt: true,
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
      onboardingPasswordSetAt: true,
      rider: { select: { id: true, riderCode: true, verificationStatus: true } }
    }
  },
  documents: { orderBy: { uploadedAt: "desc" } }
} satisfies Prisma.DeliveryCaptainApplicationSelect;

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService, private readonly applicationNotifications: ApplicationNotificationsService) {}

  async me(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: { select: publicUserSelect },
        documents: true
      }
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    return rider;
  }

  async update(userId: string, dto: UpdateRiderProfileDto) {
    await this.me(userId);
    return this.prisma.rider.update({
      where: { userId },
      data: {
        ...dto,
        preferredServiceAreas: dto.preferredServiceAreas
          ? this.preferredServiceAreasJson(dto.preferredServiceAreas)
          : undefined
      },
      include: {
        user: { select: publicUserSelect },
        documents: true
      }
    });
  }

  async createDeliveryCaptainApplication(dto: CreateDeliveryCaptainApplicationDto) {
    if (!dto.declarationAccepted || !dto.privacyAccepted || !dto.contactConsentAccepted) {
      throw new BadRequestException("Application declaration, privacy acknowledgement and contact consent are required");
    }
    this.assertLaunchLocation(dto);
    const phoneNumber = this.normalizePhone(dto.phoneNumber);
    const applicant = await this.requireApplicantAccount(phoneNumber);
    await this.assertNoActiveDuplicateApplication(applicant.id, phoneNumber);

    const application = await this.prisma.deliveryCaptainApplication.create({
      data: {
        applicationReference: await this.nextDeliveryCaptainApplicationReference(),
        applicant: { connect: { id: applicant.id } },
        fullName: dto.fullName.trim(),
        phoneNumber,
        email: this.optionalText(dto.email)?.toLowerCase(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        address: dto.address.trim(),
        preferredZone: this.optionalText(dto.preferredZone),
        vehicleType: dto.vehicleType,
        vehiclePlateNumber: this.optionalText(dto.vehiclePlateNumber),
        driverLicenceNumber: this.optionalText(dto.driverLicenceNumber),
        riderExperience: this.optionalText(dto.riderExperience),
        profilePhotoUrl: this.optionalText(dto.profilePhotoUrl),
        guarantorName: dto.guarantorName.trim(),
        guarantorPhone: this.normalizePhone(dto.guarantorPhone),
        notes: this.optionalText(dto.notes),
        documents: dto.documents?.length ? {
          create: dto.documents.map((document) => ({
            documentType: document.documentType,
            documentName: document.documentName,
            documentUrl: document.documentUrl
          }))
        } : undefined
      },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT
    });
    await Promise.all([
      this.applicationNotifications.deliveryCaptainApplicationSubmitted({
        reference: application.applicationReference,
        recipientName: application.fullName,
        phoneNumber: application.phoneNumber,
        email: application.email
      }),
      this.applicationNotifications.deliveryCaptainGuarantorListed({
        reference: application.applicationReference,
        applicantName: application.fullName,
        guarantorName: application.guarantorName,
        guarantorPhone: application.guarantorPhone
      })
    ]);

    return this.toPublicDeliveryCaptainApplicationStatus(application);
  }

  async deliveryCaptainApplicationStatus(query: DeliveryCaptainApplicationStatusQueryDto) {
    const phoneNumber = this.normalizePhone(query.phoneNumber);
    const application = await this.prisma.deliveryCaptainApplication.findFirst({
      where: { phoneNumber },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT,
      orderBy: { createdAt: "desc" }
    });
    if (!application) {
      throw new NotFoundException("Delivery Captain application status could not be found for the supplied phone number");
    }
    return this.toPublicDeliveryCaptainApplicationStatus(application);
  }

  async listDeliveryCaptainApplications(query: ListDeliveryCaptainApplicationsQueryDto) {
    const applications = await this.prisma.deliveryCaptainApplication.findMany({
      where: this.deliveryCaptainApplicationWhere(query),
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT,
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return applications.map((application) => this.toAdminDeliveryCaptainApplication(application));
  }

  async deliveryCaptainApplicationDetail(applicationId: string) {
    const application = await this.prisma.deliveryCaptainApplication.findUnique({
      where: { id: applicationId },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT
    });
    if (!application) throw new NotFoundException("Delivery Captain application not found");
    return this.toAdminDeliveryCaptainApplication(application);
  }

  async reviewDeliveryCaptainApplication(applicationId: string, dto: ReviewDeliveryCaptainApplicationDto) {
    const current = await this.prisma.deliveryCaptainApplication.findUnique({
      where: { id: applicationId },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Delivery Captain application not found");
    const application = await this.prisma.$transaction(async (tx) => {
      if (dto.status === DeliveryCaptainApplicationStatus.APPROVED && current.applicant?.phoneVerified && current.applicant.onboardingPasswordSetAt) {
        await this.ensureRiderAccountForApplication(tx, current);
      }
      return tx.deliveryCaptainApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          applicantVisibleNote: dto.applicantVisibleNote,
          adminNote: dto.adminNote,
          reviewedAt: new Date()
        },
        select: DELIVERY_CAPTAIN_APPLICATION_SELECT
      });
    });
    await this.applicationNotifications.deliveryCaptainApplicationReviewed({
      reference: application.applicationReference,
      recipientName: application.fullName,
      phoneNumber: application.phoneNumber,
      email: application.email,
      status: application.status,
      note: application.applicantVisibleNote
    });
    return this.toAdminDeliveryCaptainApplication(application);
  }

  private preferredServiceAreasJson(areas: string[]): Prisma.InputJsonValue {
    return areas
      .map((area) => area.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  private async nextDeliveryCaptainApplicationReference(): Promise<string> {
    const reference = `KGO-CAPTAIN-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await this.prisma.deliveryCaptainApplication.findUnique({ where: { applicationReference: reference }, select: { id: true } });
    return exists ? this.nextDeliveryCaptainApplicationReference() : reference;
  }

  private normalizePhone(phoneNumber: string) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!NIGERIAN_PHONE_PATTERN.test(normalized)) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }
    return normalized;
  }

  private optionalText(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private assertLaunchLocation(dto: Pick<CreateDeliveryCaptainApplicationDto, "city" | "state">) {
    const city = dto.city.trim().toLowerCase();
    const state = dto.state.trim().toLowerCase();
    const supported = (city === "kano" && state === "kano") || (city === "abuja" && state === "fct");
    if (!supported) {
      throw new BadRequestException("KariGO Delivery Captain applications are currently open for Kano and Abuja launch onboarding.");
    }
  }

  private deliveryCaptainApplicationWhere(query: ListDeliveryCaptainApplicationsQueryDto): Prisma.DeliveryCaptainApplicationWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { applicationReference: { contains: query.search, mode: "insensitive" } },
          { fullName: { contains: query.search, mode: "insensitive" } },
          { phoneNumber: { contains: query.search, mode: "insensitive" } },
          { city: { contains: query.search, mode: "insensitive" } },
          { preferredZone: { contains: query.search, mode: "insensitive" } },
          { vehiclePlateNumber: { contains: query.search, mode: "insensitive" } }
        ]
      } : {})
    };
  }

  private toPublicDeliveryCaptainApplicationStatus(application: Prisma.DeliveryCaptainApplicationGetPayload<{ select: typeof DELIVERY_CAPTAIN_APPLICATION_SELECT }>) {
    return {
      applicationReference: application.applicationReference,
      fullName: application.fullName,
      phoneNumber: application.phoneNumber,
      status: application.status,
      applicantVisibleNote: application.applicantVisibleNote,
      message: this.deliveryCaptainStatusMessage(application.status, application.applicantVisibleNote),
      submittedAt: application.createdAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      deliveryOnly: true,
      pilotCity: application.city,
      launchCities: ["Kano", "Abuja"],
      createsLogin: Boolean(application.applicantUserId),
      activatesDispatch: false,
      payoutActivation: false
    };
  }

  private toAdminDeliveryCaptainApplication(application: Prisma.DeliveryCaptainApplicationGetPayload<{ select: typeof DELIVERY_CAPTAIN_APPLICATION_SELECT }>) {
    return {
      ...application,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      documents: (application.documents ?? []).map((document) => ({
        ...document,
        uploadedAt: document.uploadedAt.toISOString(),
        verifiedAt: document.verifiedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      })),
      deliveryOnly: true,
      applicantAccount: application.applicant ? {
        id: application.applicant.id,
        accountStatus: application.applicant.accountStatus,
        phoneVerified: application.applicant.phoneVerified,
        passwordCreated: Boolean(application.applicant.onboardingPasswordSetAt),
        riderProfile: application.applicant.rider
      } : null,
      launchWarning: "Approval activates the linked Captain account for approved login, but dispatch, payouts and KariGO Rides remain controlled separately."
    };
  }

  private deliveryCaptainStatusMessage(status: DeliveryCaptainApplicationStatus, note?: string | null) {
    if (note) return note;
    const messages: Record<DeliveryCaptainApplicationStatus, string> = {
      SUBMITTED: "Your Delivery Captain application has been submitted for KariGO review.",
      UNDER_REVIEW: "Your Delivery Captain application is under review.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing your Delivery Captain review.",
      PROVISIONALLY_APPROVED: "Your application is provisionally approved. Final verification is still required before onboarding.",
      APPROVED: "Your application has been approved. Your linked Captain account can be activated for approved login; dispatch and payouts remain controlled by KariGO.",
      REJECTED: "Your Delivery Captain application was not approved at this time."
    };
    return messages[status];
  }

  private async requireApplicantAccount(phoneNumber: string) {
    const applicant = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        role: true,
        phoneVerified: true,
        onboardingPasswordSetAt: true,
        deletedAt: true
      }
    });
    if (!applicant || applicant.role !== UserRole.RIDER || applicant.deletedAt) {
      throw new BadRequestException("Create a Captain applicant account before submitting the application.");
    }
    if (!applicant.phoneVerified) {
      throw new BadRequestException("Verify the Captain applicant phone number before submitting the application.");
    }
    if (!applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Create the Captain applicant password before submitting the application.");
    }
    return applicant;
  }

  private async assertNoActiveDuplicateApplication(applicantUserId: string, phoneNumber: string) {
    const duplicate = await this.prisma.deliveryCaptainApplication.findFirst({
      where: {
        status: { not: DeliveryCaptainApplicationStatus.REJECTED },
        OR: [
          { applicantUserId },
          { phoneNumber }
        ]
      },
      select: { applicationReference: true, status: true }
    });
    if (duplicate) {
      throw new BadRequestException(`A Delivery Captain application is already active for this account (${duplicate.applicationReference}, ${duplicate.status}).`);
    }
  }

  private async ensureRiderAccountForApplication(
    tx: Prisma.TransactionClient,
    application: Prisma.DeliveryCaptainApplicationGetPayload<{ select: typeof DELIVERY_CAPTAIN_APPLICATION_SELECT }>
  ) {
    if (!application.applicantUserId) return;
    await tx.user.update({
      where: { id: application.applicantUserId },
      data: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true }
    });
    const existing = await tx.rider.findUnique({ where: { userId: application.applicantUserId }, select: { id: true } });
    if (existing) return;
    await tx.rider.create({
      data: {
        userId: application.applicantUserId,
        riderCode: await this.nextRiderCode(tx),
        phoneNumber: application.phoneNumber,
        photoUrl: application.profilePhotoUrl,
        vehicleType: application.vehicleType,
        plateNumber: application.vehiclePlateNumber,
        licenseNumber: application.driverLicenceNumber,
        guarantorName: application.guarantorName,
        guarantorPhone: application.guarantorPhone,
        availabilityStatus: RiderStatus.OFFLINE,
        verificationStatus: RiderStatus.ACTIVE,
        documents: application.documents?.length ? {
          create: application.documents.map((document) => ({
            documentType: document.documentType,
            documentUrl: document.documentUrl,
            verificationStatus: document.verificationStatus
          }))
        } : undefined
      }
    });
  }

  private async nextRiderCode(tx: Prisma.TransactionClient): Promise<string> {
    const code = `KGO-CAP-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await tx.rider.findUnique({ where: { riderCode: code }, select: { id: true } });
    return exists ? this.nextRiderCode(tx) : code;
  }
}
