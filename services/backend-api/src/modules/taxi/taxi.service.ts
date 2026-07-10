import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaxiApplicationStatus, TaxiWaitlistStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTaxiDriverApplicationDto } from "./dto/create-taxi-driver-application.dto";
import { CreateTaxiWaitlistDto } from "./dto/create-taxi-waitlist.dto";
import { ListTaxiDriverApplicationsQueryDto, ListTaxiWaitlistQueryDto } from "./dto/list-taxi-query.dto";
import { ReviewTaxiDriverApplicationDto } from "./dto/review-taxi-application.dto";
import { TaxiApplicationStatusQueryDto } from "./dto/taxi-application-status-query.dto";
import { UpdateTaxiWaitlistStatusDto } from "./dto/update-taxi-waitlist-status.dto";

const TAXI_APPLICATION_LIST_SELECT = {
  id: true,
  applicationReference: true,
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
  vehicleOwnership: true,
  status: true,
  applicantVisibleNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaxiDriverApplicationSelect;

const TAXI_APPLICATION_DETAIL_SELECT = {
  ...TAXI_APPLICATION_LIST_SELECT,
  email: true,
  address: true,
  driverLicenceNumber: true,
  driverLicenceExpiry: true,
  notes: true,
  adminNote: true,
  reviewedByAdmin: { select: { id: true, fullName: true, adminRole: true } }
} satisfies Prisma.TaxiDriverApplicationSelect;

const TAXI_WAITLIST_SELECT = {
  id: true,
  fullName: true,
  phoneNumber: true,
  email: true,
  city: true,
  state: true,
  pickupArea: true,
  note: true,
  status: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TaxiWaitlistEntrySelect;

@Injectable()
export class TaxiService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async joinWaitlist(dto: CreateTaxiWaitlistDto) {
    const phoneNumber = this.normalizePhone(dto.phoneNumber);
    const entry = await this.prisma.taxiWaitlistEntry.create({
      data: {
        fullName: dto.fullName.trim(),
        phoneNumber,
        email: dto.email?.trim().toLowerCase(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        pickupArea: dto.pickupArea?.trim(),
        note: dto.note?.trim()
      },
      select: TAXI_WAITLIST_SELECT
    });

    return {
      id: entry.id,
      fullName: entry.fullName,
      phoneNumber: entry.phoneNumber,
      city: entry.city,
      state: entry.state,
      pickupArea: entry.pickupArea,
      status: entry.status,
      message: "You have joined the KariGO Taxi waitlist. We will contact you when Taxi service is ready in your area.",
      createdAt: entry.createdAt.toISOString()
    };
  }

  async submitDriverApplication(dto: CreateTaxiDriverApplicationDto, applicantUserId?: string) {
    const phoneNumber = this.normalizePhone(dto.phoneNumber);
    const application = await this.prisma.taxiDriverApplication.create({
      data: {
        applicationReference: await this.nextApplicationReference(),
        applicantUserId,
        fullName: dto.fullName.trim(),
        phoneNumber,
        email: dto.email?.trim().toLowerCase(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        address: dto.address?.trim(),
        driverLicenceNumber: dto.driverLicenceNumber?.trim(),
        driverLicenceExpiry: dto.driverLicenceExpiry ? new Date(dto.driverLicenceExpiry) : undefined,
        vehicleMake: dto.vehicleMake?.trim(),
        vehicleModel: dto.vehicleModel?.trim(),
        vehicleYear: dto.vehicleYear,
        vehicleColour: dto.vehicleColour?.trim(),
        vehiclePlateNumber: dto.vehiclePlateNumber?.trim(),
        vehicleType: dto.vehicleType,
        vehicleOwnership: dto.vehicleOwnership,
        notes: dto.notes?.trim()
      },
      select: TAXI_APPLICATION_DETAIL_SELECT
    });
    return this.formatPublicApplicationStatus(application);
  }

  async publicApplicationStatus(query: TaxiApplicationStatusQueryDto) {
    const phoneNumber = this.normalizePhone(query.phoneNumber);
    const application = await this.prisma.taxiDriverApplication.findFirst({
      where: { phoneNumber },
      select: TAXI_APPLICATION_DETAIL_SELECT,
      orderBy: { createdAt: "desc" }
    });
    if (!application) throw new NotFoundException("Taxi driver application status could not be found for the supplied phone number");
    return this.formatPublicApplicationStatus(application);
  }

  async listDriverApplications(query: ListTaxiDriverApplicationsQueryDto) {
    const applications = await this.prisma.taxiDriverApplication.findMany({
      where: this.applicationWhere(query),
      select: TAXI_APPLICATION_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return applications.map((application) => this.adminApplicationList(application));
  }

  async driverApplicationDetail(applicationId: string) {
    const application = await this.prisma.taxiDriverApplication.findUnique({
      where: { id: applicationId },
      select: TAXI_APPLICATION_DETAIL_SELECT
    });
    if (!application) throw new NotFoundException("Taxi driver application not found");
    return this.adminApplicationDetail(application);
  }

  async reviewDriverApplication(applicationId: string, adminUserId: string, dto: ReviewTaxiDriverApplicationDto) {
    await this.driverApplicationDetail(applicationId);
    const application = await this.prisma.taxiDriverApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        applicantVisibleNote: dto.applicantVisibleNote,
        adminNote: dto.adminNote,
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date()
      },
      select: TAXI_APPLICATION_DETAIL_SELECT
    });
    await this.audit.record(adminUserId, "admin.taxi.driver_application_review", "TaxiDriverApplication", applicationId, {
      status: dto.status,
      applicantVisibleNote: dto.applicantVisibleNote,
      readinessOnly: true
    });
    return this.adminApplicationDetail(application);
  }

  async listWaitlist(query: ListTaxiWaitlistQueryDto) {
    const entries = await this.prisma.taxiWaitlistEntry.findMany({
      where: this.waitlistWhere(query),
      select: TAXI_WAITLIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return entries.map((entry) => this.waitlistEntry(entry));
  }

  async waitlistDetail(entryId: string) {
    const entry = await this.prisma.taxiWaitlistEntry.findUnique({ where: { id: entryId }, select: TAXI_WAITLIST_SELECT });
    if (!entry) throw new NotFoundException("Taxi waitlist entry not found");
    return this.waitlistEntry(entry);
  }

  async updateWaitlistStatus(entryId: string, adminUserId: string, dto: UpdateTaxiWaitlistStatusDto) {
    await this.waitlistDetail(entryId);
    const entry = await this.prisma.taxiWaitlistEntry.update({
      where: { id: entryId },
      data: { status: dto.status },
      select: TAXI_WAITLIST_SELECT
    });
    await this.audit.record(adminUserId, "admin.taxi.waitlist_status_update", "TaxiWaitlistEntry", entryId, {
      status: dto.status,
      note: dto.note
    });
    return this.waitlistEntry(entry);
  }

  private normalizePhone(phoneNumber: string) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!NIGERIAN_PHONE_PATTERN.test(normalized)) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }
    return normalized;
  }

  private async nextApplicationReference(): Promise<string> {
    const reference = `KGO-TAXI-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await this.prisma.taxiDriverApplication.findUnique({ where: { applicationReference: reference }, select: { id: true } });
    return exists ? this.nextApplicationReference() : reference;
  }

  private applicationWhere(query: ListTaxiDriverApplicationsQueryDto): Prisma.TaxiDriverApplicationWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { applicationReference: { contains: query.search, mode: "insensitive" } },
          { fullName: { contains: query.search, mode: "insensitive" } },
          { phoneNumber: { contains: query.search, mode: "insensitive" } },
          { city: { contains: query.search, mode: "insensitive" } },
          { vehiclePlateNumber: { contains: query.search, mode: "insensitive" } }
        ]
      } : {})
    };
  }

  private waitlistWhere(query: ListTaxiWaitlistQueryDto): Prisma.TaxiWaitlistEntryWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { fullName: { contains: query.search, mode: "insensitive" } },
          { phoneNumber: { contains: query.search, mode: "insensitive" } },
          { city: { contains: query.search, mode: "insensitive" } },
          { pickupArea: { contains: query.search, mode: "insensitive" } }
        ]
      } : {})
    };
  }

  private formatPublicApplicationStatus(application: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_DETAIL_SELECT }>) {
    return {
      applicationReference: application.applicationReference,
      fullName: application.fullName,
      phoneNumber: application.phoneNumber,
      status: application.status,
      applicantVisibleNote: application.applicantVisibleNote,
      message: this.statusMessage(application.status, application.applicantVisibleNote),
      submittedAt: application.createdAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      readinessOnly: true
    };
  }

  private adminApplicationList(application: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_LIST_SELECT }>) {
    return {
      ...application,
      vehicle: [application.vehicleMake, application.vehicleModel, application.vehicleYear].filter(Boolean).join(" ") || null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      readinessOnly: true
    };
  }

  private adminApplicationDetail(application: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_DETAIL_SELECT }>) {
    return {
      ...application,
      driverLicenceExpiry: application.driverLicenceExpiry?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      readinessOnly: true,
      launchWarning: "Approval is readiness-only and does not activate live taxi dispatch."
    };
  }

  private waitlistEntry(entry: Prisma.TaxiWaitlistEntryGetPayload<{ select: typeof TAXI_WAITLIST_SELECT }>) {
    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      readinessOnly: true
    };
  }

  private statusMessage(status: TaxiApplicationStatus, note?: string | null) {
    if (note) return note;
    const messages: Record<TaxiApplicationStatus, string> = {
      SUBMITTED: "Your taxi driver readiness application has been submitted for review.",
      UNDER_REVIEW: "Your taxi driver readiness application is under review.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing your taxi readiness review.",
      PROVISIONALLY_APPROVED: "Your application is provisionally approved for taxi readiness. Taxi dispatch is not live yet.",
      APPROVED: "Your application is approved for taxi readiness only. Live taxi dispatch is not active.",
      REJECTED: "Your taxi readiness application was not approved at this time."
    };
    return messages[status];
  }
}
