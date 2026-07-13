import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryCaptainApplicationStatus, Prisma } from "@prisma/client";
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
  fullName: true,
  phoneNumber: true,
  email: true,
  city: true,
  state: true,
  address: true,
  preferredZone: true,
  vehicleType: true,
  vehiclePlateNumber: true,
  riderExperience: true,
  guarantorName: true,
  guarantorPhone: true,
  notes: true,
  status: true,
  adminNote: true,
  applicantVisibleNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
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
      data: dto,
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
    this.assertKanoPilotLocation(dto);

    const application = await this.prisma.deliveryCaptainApplication.create({
      data: {
        applicationReference: await this.nextDeliveryCaptainApplicationReference(),
        fullName: dto.fullName.trim(),
        phoneNumber: this.normalizePhone(dto.phoneNumber),
        email: this.optionalText(dto.email)?.toLowerCase(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        address: dto.address.trim(),
        preferredZone: this.optionalText(dto.preferredZone),
        vehicleType: dto.vehicleType,
        vehiclePlateNumber: this.optionalText(dto.vehiclePlateNumber),
        riderExperience: this.optionalText(dto.riderExperience),
        guarantorName: dto.guarantorName.trim(),
        guarantorPhone: this.normalizePhone(dto.guarantorPhone),
        notes: this.optionalText(dto.notes)
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
    await this.deliveryCaptainApplicationDetail(applicationId);
    const application = await this.prisma.deliveryCaptainApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        applicantVisibleNote: dto.applicantVisibleNote,
        adminNote: dto.adminNote,
        reviewedAt: new Date()
      },
      select: DELIVERY_CAPTAIN_APPLICATION_SELECT
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

  private assertKanoPilotLocation(dto: Pick<CreateDeliveryCaptainApplicationDto, "city" | "state">) {
    if (dto.city !== "Kano" || dto.state !== "Kano") {
      throw new BadRequestException("KariGO Delivery Captain applications are currently limited to Kano for the controlled pilot.");
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
      pilotCity: "Kano",
      createsLogin: false,
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
      deliveryOnly: true,
      launchWarning: "Review approval does not create a Captain login, activate live dispatch, payouts or KariGO Rides access."
    };
  }

  private deliveryCaptainStatusMessage(status: DeliveryCaptainApplicationStatus, note?: string | null) {
    if (note) return note;
    const messages: Record<DeliveryCaptainApplicationStatus, string> = {
      SUBMITTED: "Your Delivery Captain application has been submitted for KariGO review.",
      UNDER_REVIEW: "Your Delivery Captain application is under review.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing your Delivery Captain review.",
      PROVISIONALLY_APPROVED: "Your application is provisionally approved. Final verification is still required before pilot onboarding.",
      APPROVED: "Your application has been approved for Delivery Captain onboarding review. Dispatch access is not activated by this form.",
      REJECTED: "Your Delivery Captain application was not approved at this time."
    };
    return messages[status];
  }
}
