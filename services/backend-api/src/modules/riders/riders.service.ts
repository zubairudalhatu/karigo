import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, DeliveryCaptainApplicationStatus, Prisma, RiderStatus, TaxiApplicationStatus, TaxiDriverProfileStatus, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
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
      role: true,
      accountStatus: true,
      deletedAt: true,
      phoneVerified: true,
      onboardingPasswordSetAt: true,
      rider: { select: { id: true, riderCode: true, verificationStatus: true } }
    }
  },
  documents: { orderBy: { uploadedAt: "desc" } }
} satisfies Prisma.DeliveryCaptainApplicationSelect;

const RIDE_CAPTAIN_APPLICATION_SELECT = {
  id: true,
  applicationReference: true,
  applicantUserId: true,
  fullName: true,
  phoneNumber: true,
  email: true,
  city: true,
  state: true,
  status: true,
  applicantVisibleNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaxiDriverApplicationSelect;

const RIDE_CAPTAIN_PROFILE_SELECT = {
  id: true,
  userId: true,
  applicationId: true,
  fullName: true,
  phoneNumber: true,
  city: true,
  state: true,
  vehicleMake: true,
  vehicleModel: true,
  vehicleYear: true,
  vehicleColour: true,
  vehiclePlateNumber: true,
  vehicleType: true,
  status: true,
  isAvailableForTaxi: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaxiDriverProfileSelect;

@Injectable()
export class RidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationNotifications: ApplicationNotificationsService,
    private readonly audit: AdminAuditService
  ) {}

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

  async resolveCaptainAccess(userId: string) {
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
        profilePhotoUrl: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user || user.deletedAt) throw new NotFoundException("KariGO account not found");
    if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.RIDER) {
      throw new ForbiddenException("This KariGO account cannot use Captain onboarding.");
    }

    const [deliveryProfile, deliveryApplication, rideProfile, rideApplication] = await Promise.all([
      this.prisma.rider.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          riderCode: true,
          verificationStatus: true,
          availabilityStatus: true,
          totalDeliveries: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      this.prisma.deliveryCaptainApplication.findFirst({
        where: {
          OR: [
            { applicantUserId: user.id },
            { phoneNumber: user.phoneNumber }
          ]
        },
        select: DELIVERY_CAPTAIN_APPLICATION_SELECT,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.taxiDriverProfile.findUnique({
        where: { userId: user.id },
        select: RIDE_CAPTAIN_PROFILE_SELECT
      }),
      this.prisma.taxiDriverApplication.findFirst({
        where: {
          OR: [
            { applicantUserId: user.id },
            { phoneNumber: user.phoneNumber }
          ]
        },
        select: RIDE_CAPTAIN_APPLICATION_SELECT,
        orderBy: { createdAt: "desc" }
      })
    ]);

    const deliveryOperational = Boolean(
      deliveryProfile &&
      !deliveryProfile.deletedAt &&
      user.accountStatus === AccountStatus.ACTIVE &&
      deliveryProfile.verificationStatus === RiderStatus.ACTIVE
    );
    const rideOperational = Boolean(
      rideProfile &&
      user.accountStatus === AccountStatus.ACTIVE &&
      rideProfile.status === TaxiDriverProfileStatus.ACTIVE_TEST
    );
    const operationalModes = [
      deliveryOperational ? "DELIVERY_CAPTAIN" : null,
      rideOperational ? "RIDE_CAPTAIN" : null
    ].filter((mode): mode is string => Boolean(mode));

    const hasApplication = Boolean(deliveryApplication || rideApplication);
    const nextStep = operationalModes.length
      ? "OPEN_DASHBOARD"
      : hasApplication
        ? "APPLICATION_STATUS"
        : "START_APPLICATION";
    const nextRoute = nextStep === "START_APPLICATION" ? "/auth/apply" : "/tabs/dashboard";

    return {
      account: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        phoneVerified: user.phoneVerified,
        profilePhotoUrl: user.profilePhotoUrl
      },
      supportedOnboardingModes: ["DELIVERY_CAPTAIN", "RIDE_CAPTAIN"],
      deliveryCaptainApplication: deliveryApplication
        ? { exists: true, ...this.toPublicDeliveryCaptainApplicationStatus(deliveryApplication) }
        : {
          exists: false,
          nextStep: "SUBMIT_APPLICATION",
          message: "Complete your Delivery Captain application to start onboarding."
        },
      rideCaptainApplication: rideApplication
        ? { exists: true, ...this.toPublicRideCaptainApplicationStatus(rideApplication) }
        : {
          exists: false,
          nextStep: "SUBMIT_APPLICATION",
          message: "Complete your Ride Captain application when you want KariGO Rides access reviewed."
        },
      deliveryCaptainProfile: deliveryProfile ? {
        id: deliveryProfile.id,
        riderCode: deliveryProfile.riderCode,
        verificationStatus: deliveryProfile.verificationStatus,
        availabilityStatus: deliveryProfile.availabilityStatus,
        totalDeliveries: deliveryProfile.totalDeliveries,
        operationalAccess: deliveryOperational,
        createdAt: deliveryProfile.createdAt.toISOString(),
        updatedAt: deliveryProfile.updatedAt.toISOString()
      } : null,
      rideCaptainProfile: rideProfile ? {
        id: rideProfile.id,
        applicationId: rideProfile.applicationId,
        fullName: rideProfile.fullName,
        phoneNumber: rideProfile.phoneNumber,
        city: rideProfile.city,
        state: rideProfile.state,
        vehicle: [rideProfile.vehicleMake, rideProfile.vehicleModel, rideProfile.vehicleYear].filter(Boolean).join(" ") || null,
        vehicleColour: rideProfile.vehicleColour,
        vehiclePlateNumber: rideProfile.vehiclePlateNumber,
        vehicleType: rideProfile.vehicleType,
        status: rideProfile.status,
        isAvailableForTaxi: rideProfile.isAvailableForTaxi,
        operationalAccess: rideOperational,
        lastSeenAt: rideProfile.lastSeenAt?.toISOString() ?? null,
        createdAt: rideProfile.createdAt.toISOString(),
        updatedAt: rideProfile.updatedAt.toISOString()
      } : null,
      operationalModes,
      nextStep,
      nextRoute,
      message: operationalModes.length
        ? "Captain access ready."
        : hasApplication
          ? "Your Captain application status is ready."
          : "Start or continue your KariGO Captain application."
    };
  }

  async createDeliveryCaptainApplication(dto: CreateDeliveryCaptainApplicationDto) {
    return this.createDeliveryCaptainApplicationRecord(dto);
  }

  async createDeliveryCaptainApplicationForUser(userId: string, dto: CreateDeliveryCaptainApplicationDto) {
    return this.createDeliveryCaptainApplicationRecord(dto, userId);
  }

  private async createDeliveryCaptainApplicationRecord(dto: CreateDeliveryCaptainApplicationDto, applicantUserId?: string) {
    if (!dto.declarationAccepted || !dto.privacyAccepted || !dto.contactConsentAccepted) {
      throw new BadRequestException("Application declaration, privacy acknowledgement and contact consent are required");
    }
    this.assertLaunchLocation(dto);
    const phoneNumber = this.normalizePhone(dto.phoneNumber);
    const applicant = await this.requireApplicantAccount(phoneNumber, applicantUserId);
    const duplicate = await this.findActiveDuplicateApplication(applicant.id, phoneNumber);
    if (duplicate) return this.toPublicDeliveryCaptainApplicationStatus(duplicate);

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

  async currentUserDeliveryCaptainApplicationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phoneNumber: true, email: true, deletedAt: true }
    });
    if (!user || user.deletedAt) throw new NotFoundException("KariGO account not found");

    const application = await this.prisma.deliveryCaptainApplication.findFirst({
      where: {
        OR: [
          { applicantUserId: user.id },
          { phoneNumber: user.phoneNumber }
        ]
      },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT,
      orderBy: { createdAt: "desc" }
    });

    if (application) return { exists: true, ...this.toPublicDeliveryCaptainApplicationStatus(application) };

    return {
      exists: false,
      nextStep: "SUBMIT_APPLICATION",
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      message: "You are signed in with your KariGO account. Complete your Captain application to start onboarding.",
      activatesDispatch: false,
      payoutActivation: false
    };
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

  async reviewDeliveryCaptainApplication(adminUserId: string, applicationId: string, dto: ReviewDeliveryCaptainApplicationDto) {
    const current = await this.prisma.deliveryCaptainApplication.findUnique({
      where: { id: applicationId },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT
    });
    if (!current) throw new NotFoundException("Delivery Captain application not found");
    if (current.status === dto.status) throw new BadRequestException(`Delivery Captain application is already ${dto.status.replaceAll("_", " ")}.`);
    if (dto.status === DeliveryCaptainApplicationStatus.REJECTED && !this.optionalText(dto.adminNote) && !this.optionalText(dto.applicantVisibleNote)) {
      throw new BadRequestException("Rejecting a Delivery Captain application requires an internal or applicant-visible reason.");
    }
    const application = await this.prisma.$transaction(async (tx) => {
      if (dto.status === DeliveryCaptainApplicationStatus.APPROVED && this.applicantReadyForCaptainApproval(current.applicant)) {
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
    await this.audit.record(adminUserId, "admin.delivery_captain_application.reviewed", "DeliveryCaptainApplication", application.id, {
      applicationReference: application.applicationReference,
      previousStatus: current.status,
      newStatus: application.status,
      hasApplicantVisibleNote: Boolean(application.applicantVisibleNote),
      hasAdminNote: Boolean(application.adminNote),
      operationalGuardrail: "Review does not activate payouts, ride dispatch, or unrestricted live operations."
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
      operationalAccess: application.applicant?.rider?.verificationStatus === RiderStatus.ACTIVE,
      applicationAccountRole: application.applicant?.role ?? null,
      activatesDispatch: false,
      payoutActivation: false
    };
  }

  private toPublicRideCaptainApplicationStatus(application: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof RIDE_CAPTAIN_APPLICATION_SELECT }>) {
    return {
      applicationReference: application.applicationReference,
      fullName: application.fullName,
      phoneNumber: application.phoneNumber,
      status: application.status,
      applicantVisibleNote: application.applicantVisibleNote,
      message: this.rideCaptainStatusMessage(application.status, application.applicantVisibleNote),
      submittedAt: application.createdAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      readinessOnly: true,
      pilotCity: application.city,
      launchCities: ["Kano", "Abuja"],
      operationalAccess: false
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
        role: application.applicant.role,
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

  private rideCaptainStatusMessage(status: TaxiApplicationStatus, note?: string | null) {
    if (note) return note;
    const messages: Record<TaxiApplicationStatus, string> = {
      SUBMITTED: "Your Ride Captain application has been submitted for review.",
      UNDER_REVIEW: "Your Ride Captain application is under review.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing your Ride Captain review.",
      PROVISIONALLY_APPROVED: "Your Ride Captain application is provisionally approved. Ride operations are activated by KariGO Operations.",
      APPROVED: "Your Ride Captain application is approved. Ride operations are activated by KariGO Operations.",
      REJECTED: "Your Ride Captain application was not approved at this time."
    };
    return messages[status];
  }

  private async requireApplicantAccount(phoneNumber: string, applicantUserId?: string) {
    const applicant = await this.prisma.user.findUnique({
      where: applicantUserId ? { id: applicantUserId } : { phoneNumber },
      select: {
        id: true,
        role: true,
        phoneNumber: true,
        accountStatus: true,
        phoneVerified: true,
        onboardingPasswordSetAt: true,
        deletedAt: true
      }
    });
    if (!applicant || applicant.deletedAt) {
      throw new BadRequestException("Create a Captain applicant account before submitting the application.");
    }
    if (applicantUserId && applicant.phoneNumber !== phoneNumber) {
      throw new BadRequestException("Use your signed-in KariGO account phone number for this Captain application.");
    }
    if (applicant.role === UserRole.CUSTOMER) {
      if (!applicantUserId) {
        throw new BadRequestException("This phone number already has a KariGO account. Sign in with your existing KariGO password to continue your Captain application.");
      }
      if (!applicant.phoneVerified || applicant.accountStatus !== AccountStatus.ACTIVE) {
        throw new BadRequestException("Sign in with an active verified KariGO Customer account before continuing Captain onboarding.");
      }
      return applicant;
    }
    if (applicant.role !== UserRole.RIDER) {
      throw new BadRequestException("This KariGO account is not eligible for Captain onboarding from the Captain app.");
    }
    if (!applicant.phoneVerified) {
      throw new BadRequestException("Verify the Captain applicant phone number before submitting the application.");
    }
    if (!applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Create the Captain applicant password before submitting the application.");
    }
    return applicant;
  }

  private async findActiveDuplicateApplication(applicantUserId: string, phoneNumber: string) {
    return this.prisma.deliveryCaptainApplication.findFirst({
      where: {
        status: { not: DeliveryCaptainApplicationStatus.REJECTED },
        OR: [
          { applicantUserId },
          { phoneNumber }
        ]
      },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT,
      orderBy: { createdAt: "desc" }
    });
  }

  private applicantReadyForCaptainApproval(
    applicant: Prisma.DeliveryCaptainApplicationGetPayload<{ select: typeof DELIVERY_CAPTAIN_APPLICATION_SELECT }>["applicant"]
  ) {
    if (!applicant || applicant.deletedAt || !applicant.phoneVerified) return false;
    if (applicant.role === UserRole.CUSTOMER) return applicant.accountStatus === AccountStatus.ACTIVE;
    return applicant.role === UserRole.RIDER && Boolean(applicant.onboardingPasswordSetAt);
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
