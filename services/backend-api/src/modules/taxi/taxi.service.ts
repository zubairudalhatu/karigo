import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  Prisma,
  RiderStatus,
  TaxiApplicationStatus,
  TaxiDriverProfileStatus,
  TaxiTripActorType,
  TaxiTripStatus,
  TaxiWaitlistStatus,
  UserRole
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes, randomInt } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminAssignTaxiDriverDto } from "./dto/admin-assign-taxi-driver.dto";
import { UpdateTaxiDriverProfileStatusDto } from "./dto/admin-taxi-profile.dto";
import { CreateTaxiDriverApplicationDto } from "./dto/create-taxi-driver-application.dto";
import { CreateTaxiTripDto } from "./dto/create-taxi-trip.dto";
import { CreateTaxiWaitlistDto } from "./dto/create-taxi-waitlist.dto";
import { ListTaxiDriverApplicationsQueryDto, ListTaxiWaitlistQueryDto } from "./dto/list-taxi-query.dto";
import { ReviewTaxiDriverApplicationDto } from "./dto/review-taxi-application.dto";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { TaxiDriverAvailabilityDto } from "./dto/taxi-driver-availability.dto";
import { TaxiFareEstimateDto } from "./dto/taxi-fare-estimate.dto";
import { TaxiStartTripDto } from "./dto/taxi-start-trip.dto";
import { TaxiApplicationStatusQueryDto } from "./dto/taxi-application-status-query.dto";
import { UpdateTaxiWaitlistStatusDto } from "./dto/update-taxi-waitlist-status.dto";

const TAXI_APPLICATION_LIST_SELECT = {
  id: true,
  applicationReference: true,
  applicantUserId: true,
  fullName: true,
  phoneNumber: true,
  city: true,
  state: true,
  vehicleMake: true,
  vehicleModel: true,
  vehicleYear: true,
  vehicleColour: true,
  vehiclePlateNumber: true,
  driverLicenceDocumentUrl: true,
  vehicleParticularsDocumentUrl: true,
  insuranceDocumentUrl: true,
  vehicleType: true,
  vehicleOwnership: true,
  applicant: { select: { id: true, accountStatus: true, phoneVerified: true, onboardingPasswordSetAt: true, rider: { select: { id: true, riderCode: true, verificationStatus: true } } } },
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
  driverLicenceDocumentUrl: true,
  driverLicenceExpiry: true,
  vehicleParticularsDocumentUrl: true,
  insuranceDocumentUrl: true,
  notes: true,
  adminNote: true,
  applicant: { select: { id: true, accountStatus: true, phoneVerified: true, onboardingPasswordSetAt: true, rider: { select: { id: true, riderCode: true, verificationStatus: true } } } },
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

const TAXI_TRIP_INCLUDE = {
  customer: { include: { user: { select: { id: true, fullName: true, phoneNumber: true } } } },
  driverProfile: true,
  events: { orderBy: { createdAt: "asc" as const } }
} satisfies Prisma.TaxiTripInclude;

type TaxiTripWithRelations = Prisma.TaxiTripGetPayload<{ include: typeof TAXI_TRIP_INCLUDE }>;

type TaxiDriverProfileForResponse = {
  id: string;
  userId: string | null;
  applicationId: string | null;
  fullName: string;
  phoneNumber: string;
  city: string;
  state: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleColour: string | null;
  vehiclePlateNumber: string | null;
  vehicleType: Prisma.TaxiDriverProfileGetPayload<Record<string, never>>["vehicleType"];
  status: TaxiDriverProfileStatus;
  isAvailableForTaxi: boolean;
  lastKnownLatitude: Prisma.Decimal | null;
  lastKnownLongitude: Prisma.Decimal | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const ACTIVE_TAXI_TRIP_STATUSES: TaxiTripStatus[] = [
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED,
  TaxiTripStatus.ARRIVED_PICKUP,
  TaxiTripStatus.STARTED,
  TaxiTripStatus.ARRIVED_DESTINATION
];

const CLOSED_TAXI_TRIP_STATUSES: TaxiTripStatus[] = [
  TaxiTripStatus.COMPLETED,
  TaxiTripStatus.CANCELLED_BY_ADMIN,
  TaxiTripStatus.CANCELLED_BY_CUSTOMER,
  TaxiTripStatus.CANCELLED_BY_DRIVER,
  TaxiTripStatus.EXPIRED
];

@Injectable()
export class TaxiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly config: ConfigService,
    private readonly applicationNotifications: ApplicationNotificationsService
  ) {}

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
    await this.applicationNotifications.rideWaitlistJoined({
      reference: entry.id,
      recipientName: entry.fullName,
      phoneNumber: entry.phoneNumber,
      email: entry.email
    });

    return {
      id: entry.id,
      fullName: entry.fullName,
      phoneNumber: entry.phoneNumber,
      city: entry.city,
      state: entry.state,
      pickupArea: entry.pickupArea,
      status: entry.status,
      message: "You have joined the KariGO Rides waitlist. We will contact you when Ride service is ready in your area.",
      createdAt: entry.createdAt.toISOString()
    };
  }

  async submitDriverApplication(dto: CreateTaxiDriverApplicationDto, applicantUserId?: string) {
    const phoneNumber = this.normalizePhone(dto.phoneNumber);
    const applicant = applicantUserId
      ? await this.requireApplicantUserById(applicantUserId)
      : await this.requireApplicantAccount(phoneNumber);
    await this.assertNoActiveDuplicateApplication(applicant.id, phoneNumber);
    const application = await this.prisma.taxiDriverApplication.create({
      data: {
        applicationReference: await this.nextApplicationReference(),
        applicantUserId: applicant.id,
        fullName: dto.fullName.trim(),
        phoneNumber,
        email: dto.email?.trim().toLowerCase(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        address: dto.address?.trim(),
        driverLicenceNumber: dto.driverLicenceNumber?.trim(),
        driverLicenceDocumentUrl: dto.driverLicenceDocumentUrl.trim(),
        driverLicenceExpiry: dto.driverLicenceExpiry ? new Date(dto.driverLicenceExpiry) : undefined,
        vehicleMake: dto.vehicleMake?.trim(),
        vehicleModel: dto.vehicleModel?.trim(),
        vehicleYear: dto.vehicleYear,
        vehicleColour: dto.vehicleColour?.trim(),
        vehiclePlateNumber: dto.vehiclePlateNumber?.trim(),
        vehicleType: dto.vehicleType,
        vehicleOwnership: dto.vehicleOwnership,
        vehicleParticularsDocumentUrl: dto.vehicleParticularsDocumentUrl.trim(),
        insuranceDocumentUrl: dto.insuranceDocumentUrl?.trim(),
        notes: dto.notes?.trim()
      },
      select: TAXI_APPLICATION_DETAIL_SELECT
    });
    await this.applicationNotifications.rideCaptainApplicationSubmitted({
      reference: application.applicationReference,
      recipientName: application.fullName,
      phoneNumber: application.phoneNumber,
      email: application.email
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
    if (!application) throw new NotFoundException("Ride Captain application status could not be found for the supplied phone number");
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
    if (!application) throw new NotFoundException("Ride Captain application not found");
    return this.adminApplicationDetail(application);
  }

  async reviewDriverApplication(applicationId: string, adminUserId: string, dto: ReviewTaxiDriverApplicationDto) {
    const current = await this.prisma.taxiDriverApplication.findUnique({
      where: { id: applicationId },
      select: TAXI_APPLICATION_DETAIL_SELECT
    });
    if (!current) throw new NotFoundException("Ride Captain application not found");
    const application = await this.prisma.$transaction(async (tx) => {
      if (dto.status === TaxiApplicationStatus.APPROVED && current.applicant?.phoneVerified && current.applicant.onboardingPasswordSetAt) {
        await this.ensureRiderProfileForRideApplication(tx, current);
      }
      return tx.taxiDriverApplication.update({
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
    if (!entry) throw new NotFoundException("Ride waitlist entry not found");
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

  fareEstimate(dto: TaxiFareEstimateDto) {
    this.assertTaxiStagingEnabled();
    return this.calculateFare(dto);
  }

  customerFareEstimate(_userId: string, dto: TaxiFareEstimateDto) {
    this.assertTaxiStagingEnabled();
    return this.calculateFare(dto);
  }

  async createCustomerTrip(userId: string, dto: CreateTaxiTripDto) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const estimate = this.calculateFare(dto);
    const tripPin = randomInt(100000, 1000000).toString();
    const tripPinHash = await bcrypt.hash(tripPin, 10);
    const tripReference = await this.nextTripReference();
    const now = new Date();

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.taxiTrip.create({
        data: {
          tripReference,
          customerId: customer.id,
          pickupAddress: dto.pickupAddress.trim(),
          pickupLatitude: this.decimalOrUndefined(dto.pickupLatitude),
          pickupLongitude: this.decimalOrUndefined(dto.pickupLongitude),
          destinationAddress: dto.destinationAddress.trim(),
          destinationLatitude: this.decimalOrUndefined(dto.destinationLatitude),
          destinationLongitude: this.decimalOrUndefined(dto.destinationLongitude),
          estimatedDistanceKm: this.decimalOrUndefined(estimate.estimatedDistanceKm),
          estimatedDurationMin: estimate.estimatedDurationMin,
          estimatedFareKobo: estimate.estimatedFareKobo,
          tripPinHash,
          tripPinLastFour: tripPin.slice(-4),
          customerNote: dto.customerNote?.trim(),
          requestedAt: now
        },
        include: this.tripInclude()
      });
      await tx.taxiTripEvent.create({
        data: {
          tripId: created.id,
          actorType: TaxiTripActorType.CUSTOMER,
          actorId: userId,
          eventType: "taxi.trip.requested",
          note: "Ride request recorded",
          metadata: {
            isTestMode: true,
            estimatedFareKobo: estimate.estimatedFareKobo,
            pricing: estimate.pricing
          } as Prisma.InputJsonValue
        }
      });
      return created;
    });

    return {
      ...this.formatTrip(trip),
      tripPin,
      testModeNotice: this.testModeNotice()
    };
  }

  async customerTrips(userId: string) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trips = await this.prisma.taxiTrip.findMany({
      where: { customerId: customer.id },
      include: this.tripInclude(),
      orderBy: { createdAt: "desc" }
    });
    return trips.map((trip) => this.formatTrip(trip));
  }

  async customerTrip(userId: string, tripId: string) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trip = await this.prisma.taxiTrip.findFirst({
      where: { id: tripId, customerId: customer.id },
      include: this.tripInclude()
    });
    if (!trip) throw new NotFoundException("Ride request not found");
    return this.formatTrip(trip);
  }

  async customerCancelTrip(userId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trip = await this.prisma.taxiTrip.findFirst({ where: { id: tripId, customerId: customer.id } });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    const supportCancelStatuses: TaxiTripStatus[] = [TaxiTripStatus.STARTED, TaxiTripStatus.ARRIVED_DESTINATION];
    if (supportCancelStatuses.includes(trip.status)) {
      throw new BadRequestException("Contact support to cancel an active Ride request");
    }
    return this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_CUSTOMER, userId, TaxiTripActorType.CUSTOMER, dto.reason);
  }

  async riderTaxiProfile(userId: string) {
    this.assertTaxiStagingEnabled();
    const profile = await this.prisma.taxiDriverProfile.findUnique({
      where: { userId },
      include: { application: true }
    });
    if (!profile) throw new NotFoundException("Ride Captain profile not found");
    return this.formatDriverProfile(profile);
  }

  async updateRiderTaxiAvailability(userId: string, dto: TaxiDriverAvailabilityDto) {
    this.assertTaxiStagingEnabled();
    const profile = await this.requireActiveTaxiDriverProfile(userId);
    const updated = await this.prisma.taxiDriverProfile.update({
      where: { id: profile.id },
      data: {
        isAvailableForTaxi: dto.isAvailableForTaxi,
        lastKnownLatitude: this.decimalOrUndefined(dto.latitude),
        lastKnownLongitude: this.decimalOrUndefined(dto.longitude),
        lastSeenAt: new Date()
      },
      include: { application: true }
    });
    return this.formatDriverProfile(updated);
  }

  async availableTaxiTrips(userId: string) {
    this.assertTaxiStagingEnabled();
    const profile = await this.requireActiveTaxiDriverProfile(userId);
    if (!profile.isAvailableForTaxi) return [];
    const trips = await this.prisma.taxiTrip.findMany({
      where: {
        OR: [
          { status: TaxiTripStatus.REQUESTED, driverProfileId: null },
          { status: TaxiTripStatus.DRIVER_ASSIGNED, driverProfileId: profile.id }
        ]
      },
      include: this.tripInclude(),
      orderBy: { createdAt: "asc" },
      take: 20
    });
    return trips.map((trip) => this.formatTrip(trip));
  }

  async acceptTaxiTrip(userId: string, tripId: string) {
    this.assertTaxiStagingEnabled();
    const profile = await this.requireActiveTaxiDriverProfile(userId);
    await this.assertDriverHasNoActiveTrip(profile.id, tripId);
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (trip.driverProfileId && trip.driverProfileId !== profile.id) throw new ConflictException("Ride request is assigned to another Captain");
    const acceptableStatuses: TaxiTripStatus[] = [TaxiTripStatus.REQUESTED, TaxiTripStatus.DRIVER_ASSIGNED];
    if (!acceptableStatuses.includes(trip.status)) {
      throw new BadRequestException("Ride request cannot be accepted from its current status");
    }
    const updated = await this.updateTripWithEvent(trip.id, {
      driverProfile: { connect: { id: profile.id } },
      status: TaxiTripStatus.ACCEPTED,
      acceptedAt: new Date()
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.accepted", "Ride Captain accepted ride request");
    return this.formatTrip(updated);
  }

  async riderArrivedPickup(userId: string, tripId: string) {
    return this.riderTripTransition(userId, tripId, TaxiTripStatus.ACCEPTED, TaxiTripStatus.ARRIVED_PICKUP, "taxi.trip.arrived_pickup", { arrivedAtPickupAt: new Date() });
  }

  async riderStartTrip(userId: string, tripId: string, dto: TaxiStartTripDto) {
    this.assertTaxiStagingEnabled();
    const { profile, trip } = await this.requireDriverTrip(userId, tripId);
    if (trip.status !== TaxiTripStatus.ARRIVED_PICKUP) throw new BadRequestException("Ride Captain must arrive at pickup before starting the trip");
    if (!trip.tripPinHash || !(await bcrypt.compare(dto.tripPin, trip.tripPinHash))) {
      throw new BadRequestException("Invalid trip PIN");
    }
    const updated = await this.updateTripWithEvent(trip.id, {
      status: TaxiTripStatus.STARTED,
      startedAt: new Date()
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.started", `Ride Captain ${profile.fullName} started ride request`);
    return this.formatTrip(updated);
  }

  async riderArrivedDestination(userId: string, tripId: string) {
    return this.riderTripTransition(userId, tripId, TaxiTripStatus.STARTED, TaxiTripStatus.ARRIVED_DESTINATION, "taxi.trip.arrived_destination", { arrivedAtDestinationAt: new Date() });
  }

  async riderCompleteTrip(userId: string, tripId: string) {
    this.assertTaxiStagingEnabled();
    const { trip } = await this.requireDriverTrip(userId, tripId);
    if (trip.status !== TaxiTripStatus.ARRIVED_DESTINATION) throw new BadRequestException("Ride Captain must arrive at destination before completing the trip");
    const updated = await this.updateTripWithEvent(trip.id, {
      status: TaxiTripStatus.COMPLETED,
      completedAt: new Date(),
      finalFareKobo: trip.estimatedFareKobo,
      tripPinHash: null
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.completed", "Ride request completed");
    return this.formatTrip(updated);
  }

  async riderCancelTrip(userId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const { trip } = await this.requireDriverTrip(userId, tripId);
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    return this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_DRIVER, userId, TaxiTripActorType.DRIVER, dto.reason);
  }

  async adminDriverProfiles() {
    this.assertTaxiStagingEnabled();
    const profiles = await this.prisma.taxiDriverProfile.findMany({
      include: { application: true },
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return profiles.map((profile) => this.formatDriverProfile(profile));
  }

  async adminCreateDriverProfileFromApplication(adminUserId: string, applicationId: string) {
    this.assertTaxiStagingEnabled();
    const application = await this.prisma.taxiDriverApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException("Ride Captain application not found");
    const approvedStatuses: TaxiApplicationStatus[] = [TaxiApplicationStatus.APPROVED, TaxiApplicationStatus.PROVISIONALLY_APPROVED];
    if (!approvedStatuses.includes(application.status)) {
      throw new BadRequestException("Only approved or provisionally approved applications can create a Ride Captain profile");
    }
    const profile = await this.prisma.taxiDriverProfile.upsert({
      where: { applicationId },
      update: {
        fullName: application.fullName,
        phoneNumber: application.phoneNumber,
        city: application.city,
        state: application.state,
        vehicleMake: application.vehicleMake,
        vehicleModel: application.vehicleModel,
        vehicleYear: application.vehicleYear,
        vehicleColour: application.vehicleColour,
        vehiclePlateNumber: application.vehiclePlateNumber,
        vehicleType: application.vehicleType
      },
      create: {
        userId: application.applicantUserId,
        applicationId,
        fullName: application.fullName,
        phoneNumber: application.phoneNumber,
        city: application.city,
        state: application.state,
        vehicleMake: application.vehicleMake,
        vehicleModel: application.vehicleModel,
        vehicleYear: application.vehicleYear,
        vehicleColour: application.vehicleColour,
        vehiclePlateNumber: application.vehiclePlateNumber,
        vehicleType: application.vehicleType
      },
      include: { application: true }
    });
    await this.audit.record(adminUserId, "admin.taxi.driver_profile.created_from_application", "TaxiDriverProfile", profile.id, {
      applicationId,
      readinessOnly: false,
      stagingOnly: true
    });
    return this.formatDriverProfile(profile);
  }

  async adminUpdateDriverProfileStatus(adminUserId: string, profileId: string, dto: UpdateTaxiDriverProfileStatusDto) {
    this.assertTaxiStagingEnabled();
    const data: Prisma.TaxiDriverProfileUpdateInput = { status: dto.status };
    if (dto.status !== TaxiDriverProfileStatus.ACTIVE_TEST) data.isAvailableForTaxi = false;
    const profile = await this.prisma.taxiDriverProfile.update({
      where: { id: profileId },
      data,
      include: { application: true }
    });
    await this.audit.record(adminUserId, "admin.taxi.driver_profile.status_updated", "TaxiDriverProfile", profile.id, {
      status: dto.status,
      note: dto.note,
      stagingOnly: true
    });
    return this.formatDriverProfile(profile);
  }

  async adminTrips() {
    this.assertTaxiStagingEnabled();
    const trips = await this.prisma.taxiTrip.findMany({
      include: this.tripInclude(),
      orderBy: { createdAt: "desc" },
      take: 150
    });
    return trips.map((trip) => this.formatTrip(trip));
  }

  async adminTrip(tripId: string) {
    this.assertTaxiStagingEnabled();
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId }, include: this.tripInclude() });
    if (!trip) throw new NotFoundException("Ride request not found");
    return this.formatTrip(trip);
  }

  async adminAssignDriver(adminUserId: string, tripId: string, dto: AdminAssignTaxiDriverDto) {
    this.assertTaxiStagingEnabled();
    const [trip, profile] = await Promise.all([
      this.prisma.taxiTrip.findUnique({ where: { id: tripId } }),
      this.prisma.taxiDriverProfile.findUnique({ where: { id: dto.driverProfileId } })
    ]);
    if (!trip) throw new NotFoundException("Ride request not found");
    if (!profile || profile.status !== TaxiDriverProfileStatus.ACTIVE_TEST || !profile.isAvailableForTaxi) {
      throw new BadRequestException("Ride Captain profile is not active and available");
    }
    if (trip.status !== TaxiTripStatus.REQUESTED) throw new BadRequestException("Only requested Ride requests can be assigned");
    await this.assertDriverHasNoActiveTrip(profile.id, trip.id);
    const updated = await this.updateTripWithEvent(trip.id, {
      driverProfile: { connect: { id: profile.id } },
      status: TaxiTripStatus.DRIVER_ASSIGNED
    }, adminUserId, TaxiTripActorType.ADMIN, "taxi.trip.driver_assigned", "Admin assigned Ride Captain");
    await this.audit.record(adminUserId, "admin.taxi.trip.driver_assigned", "TaxiTrip", trip.id, {
      driverProfileId: profile.id,
      stagingOnly: true
    });
    return this.formatTrip(updated);
  }

  async adminCancelTrip(adminUserId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    const updated = await this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_ADMIN, adminUserId, TaxiTripActorType.ADMIN, dto.reason);
    await this.audit.record(adminUserId, "admin.taxi.trip.cancelled", "TaxiTrip", trip.id, {
      reason: dto.reason,
      stagingOnly: true
    });
    return updated;
  }

  async adminSummary() {
    this.assertTaxiStagingEnabled();
    const [driverProfiles, availableDrivers, requestedTrips, activeTrips, completedTrips, cancelledTrips] = await Promise.all([
      this.prisma.taxiDriverProfile.count(),
      this.prisma.taxiDriverProfile.count({ where: { status: TaxiDriverProfileStatus.ACTIVE_TEST, isAvailableForTaxi: true } }),
      this.prisma.taxiTrip.count({ where: { status: TaxiTripStatus.REQUESTED } }),
      this.prisma.taxiTrip.count({ where: { status: { in: ACTIVE_TAXI_TRIP_STATUSES } } }),
      this.prisma.taxiTrip.count({ where: { status: TaxiTripStatus.COMPLETED } }),
      this.prisma.taxiTrip.count({ where: { status: { in: [TaxiTripStatus.CANCELLED_BY_ADMIN, TaxiTripStatus.CANCELLED_BY_CUSTOMER, TaxiTripStatus.CANCELLED_BY_DRIVER] } } })
    ]);
    return {
      driverProfiles,
      availableDrivers,
      requestedTrips,
      activeTrips,
      completedTrips,
      cancelledTrips,
      pricingDefaults: this.ridePricingDefaults(),
      testModeNotice: this.testModeNotice()
    };
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
      throw new BadRequestException("Create a Captain applicant account before submitting the Ride Captain application.");
    }
    if (!applicant.phoneVerified) {
      throw new BadRequestException("Verify the Captain applicant phone number before submitting the Ride Captain application.");
    }
    if (!applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Create the Captain applicant password before submitting the Ride Captain application.");
    }
    return applicant;
  }

  private async requireApplicantUserById(applicantUserId: string) {
    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantUserId },
      select: {
        id: true,
        role: true,
        phoneVerified: true,
        onboardingPasswordSetAt: true,
        deletedAt: true
      }
    });
    if (!applicant || applicant.role !== UserRole.RIDER || applicant.deletedAt || !applicant.phoneVerified || !applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Captain applicant account is not ready for application submission.");
    }
    return applicant;
  }

  private async assertNoActiveDuplicateApplication(applicantUserId: string, phoneNumber: string) {
    const duplicate = await this.prisma.taxiDriverApplication.findFirst({
      where: {
        status: { not: TaxiApplicationStatus.REJECTED },
        OR: [
          { applicantUserId },
          { phoneNumber }
        ]
      },
      select: { applicationReference: true, status: true }
    });
    if (duplicate) {
      throw new BadRequestException(`A Ride Captain application is already active for this account (${duplicate.applicationReference}, ${duplicate.status}).`);
    }
  }

  private async ensureRiderProfileForRideApplication(
    tx: Prisma.TransactionClient,
    application: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_DETAIL_SELECT }>
  ) {
    if (!application.applicantUserId) return;
    await tx.user.update({
      where: { id: application.applicantUserId },
      data: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true }
    });
    const existingRider = await tx.rider.findUnique({ where: { userId: application.applicantUserId }, select: { id: true } });
    if (!existingRider) {
      await tx.rider.create({
        data: {
          userId: application.applicantUserId,
          riderCode: await this.nextRiderCode(tx),
          phoneNumber: application.phoneNumber,
          vehicleType: application.vehicleType ?? undefined,
          plateNumber: application.vehiclePlateNumber,
          licenseNumber: application.driverLicenceNumber,
          availabilityStatus: RiderStatus.OFFLINE,
          verificationStatus: RiderStatus.PENDING_APPROVAL
        }
      });
    }
  }

  private async nextRiderCode(tx: Prisma.TransactionClient): Promise<string> {
    const code = `KGO-CAP-${randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await tx.rider.findUnique({ where: { riderCode: code }, select: { id: true } });
    return exists ? this.nextRiderCode(tx) : code;
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

  private async nextTripReference(): Promise<string> {
    const reference = `KGO-TAXI-TRIP-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const exists = await this.prisma.taxiTrip.findUnique({ where: { tripReference: reference }, select: { id: true } });
    return exists ? this.nextTripReference() : reference;
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

  private assertTaxiStagingEnabled() {
    if (!this.config.get<boolean>("TAXI_SERVICE_ENABLED", false) || !this.config.get<boolean>("TAXI_STAGING_DISPATCH_ENABLED", false)) {
      throw new ForbiddenException("KariGO Rides dispatch is disabled. Ride requests remain behind operations approval.");
    }
  }

  private calculateFare(dto: TaxiFareEstimateDto) {
    const distance = Number(dto.estimatedDistanceKm ?? 5);
    const duration = Math.round(Number(dto.estimatedDurationMin ?? Math.max(10, distance * 4)));
    const waitingMinutes = Math.max(0, Math.round(Number(dto.waitingMinutes ?? 0)));
    if (!Number.isFinite(distance) || distance <= 0) throw new BadRequestException("Estimated distance must be greater than zero");
    if (!Number.isFinite(duration) || duration <= 0) throw new BadRequestException("Estimated duration must be greater than zero");
    if (!Number.isFinite(waitingMinutes)) throw new BadRequestException("Waiting minutes must be a valid number");

    const pricing = this.ridePricingDefaults();
    const billableWaitingMinutes = Math.max(0, waitingMinutes - pricing.waitingGraceMinutes);
    const distanceFareKobo = Math.round(distance * pricing.perKmKobo);
    const waitingChargeKobo = billableWaitingMinutes * pricing.waitingChargeKoboPerMinute;
    const estimatedFareKobo = distanceFareKobo + waitingChargeKobo;
    const karigoCommissionKobo = Math.round(estimatedFareKobo * (pricing.karigoCommissionPercent / 100));
    const captainNetEstimateKobo = Math.max(0, estimatedFareKobo - karigoCommissionKobo);

    return {
      pickupAddress: dto.pickupAddress.trim(),
      destinationAddress: dto.destinationAddress.trim(),
      estimatedDistanceKm: Number(distance.toFixed(2)),
      estimatedDurationMin: duration,
      waitingMinutes,
      billableWaitingMinutes,
      distanceFareKobo,
      waitingChargeKobo,
      estimatedFareKobo,
      karigoCommissionKobo,
      captainNetEstimateKobo,
      currency: "NGN",
      formula: {
        perKmKobo: pricing.perKmKobo,
        waitingChargeKoboPerMinute: pricing.waitingChargeKoboPerMinute,
        waitingGraceMinutes: pricing.waitingGraceMinutes,
        karigoCommissionPercent: pricing.karigoCommissionPercent,
        vatTaxKobo: pricing.vatTaxKobo,
        vatTaxConfigured: pricing.vatTaxConfigured
      },
      pricing,
      testModeNotice: this.testModeNotice()
    };
  }

  private ridePricingDefaults() {
    const vatTaxKobo = this.config.get<number>("RIDE_VAT_TAX_KOBO", 0);
    return {
      launchCities: ["Kano", "Abuja"],
      perKmKobo: this.config.get<number>("RIDE_PER_KM_KOBO", 40000),
      karigoCommissionPercent: this.config.get<number>("RIDE_CAPTAIN_COMMISSION_PERCENT", 10),
      waitingChargeKoboPerMinute: this.config.get<number>("RIDE_WAITING_CHARGE_KOBO_PER_MINUTE", 500),
      waitingGraceMinutes: this.config.get<number>("RIDE_WAITING_GRACE_MINUTES", 5),
      vatTaxKobo,
      vatTaxConfigured: vatTaxKobo > 0,
      dispatchEnabled: this.config.get<boolean>("TAXI_STAGING_DISPATCH_ENABLED", false)
    };
  }

  private testModeNotice() {
    return "KariGO Rides remains controlled by operations flags. No ride dispatch or ride payment is active unless approved.";
  }

  private decimalOrUndefined(value?: number) {
    return value === undefined || value === null ? undefined : new Prisma.Decimal(value);
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException("Customer profile not found");
    return customer;
  }

  private async requireActiveTaxiDriverProfile(userId: string) {
    const profile = await this.prisma.taxiDriverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Ride Captain profile not found");
    if (profile.status !== TaxiDriverProfileStatus.ACTIVE_TEST) {
      throw new BadRequestException("Ride Captain profile is not active for Ride requests");
    }
    return profile;
  }

  private async requireDriverTrip(userId: string, tripId: string) {
    const profile = await this.requireActiveTaxiDriverProfile(userId);
    const trip = await this.prisma.taxiTrip.findFirst({
      where: { id: tripId, driverProfileId: profile.id },
      include: this.tripInclude()
    });
    if (!trip) throw new NotFoundException("Ride request not found for this Captain");
    return { profile, trip };
  }

  private async assertDriverHasNoActiveTrip(driverProfileId: string, excludingTripId?: string) {
    const active = await this.prisma.taxiTrip.findFirst({
      where: {
        driverProfileId,
        status: { in: ACTIVE_TAXI_TRIP_STATUSES },
        ...(excludingTripId ? { id: { not: excludingTripId } } : {})
      },
      select: { id: true }
    });
    if (active) throw new ConflictException("Ride Captain already has an active ride request");
  }

  private async riderTripTransition(
    userId: string,
    tripId: string,
    expectedStatus: TaxiTripStatus,
    nextStatus: TaxiTripStatus,
    eventType: string,
    data: Prisma.TaxiTripUpdateInput
  ) {
    this.assertTaxiStagingEnabled();
    const { trip } = await this.requireDriverTrip(userId, tripId);
    if (trip.status !== expectedStatus) {
      throw new BadRequestException(`Ride request must be ${expectedStatus.replaceAll("_", " ").toLowerCase()} before this action`);
    }
    const updated = await this.updateTripWithEvent(trip.id, {
      ...data,
      status: nextStatus
    }, userId, TaxiTripActorType.DRIVER, eventType, `Ride Captain moved request to ${nextStatus}`);
    return this.formatTrip(updated);
  }

  private async cancelTrip(tripId: string, status: TaxiTripStatus, actorId: string, actorType: TaxiTripActorType, reason?: string) {
    const updated = await this.updateTripWithEvent(tripId, {
      status,
      cancellationReason: reason?.trim() || "Ride request cancelled",
      cancelledAt: new Date(),
      tripPinHash: null
    }, actorId, actorType, "taxi.trip.cancelled", reason || "Ride request cancelled");
    return this.formatTrip(updated);
  }

  private async updateTripWithEvent(
    tripId: string,
    data: Prisma.TaxiTripUpdateInput,
    actorId: string,
    actorType: TaxiTripActorType,
    eventType: string,
    note: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.taxiTrip.update({
        where: { id: tripId },
        data,
        include: this.tripInclude()
      });
      await tx.taxiTripEvent.create({
        data: {
          tripId,
          actorType,
          actorId,
          eventType,
          note,
          metadata: { isTestMode: true } as Prisma.InputJsonValue
        }
      });
      return updated;
    });
  }

  private tripInclude() {
    return TAXI_TRIP_INCLUDE;
  }

  private formatTrip(trip: TaxiTripWithRelations) {
    return {
      id: trip.id,
      tripReference: trip.tripReference,
      pickupAddress: trip.pickupAddress,
      pickupLatitude: trip.pickupLatitude,
      pickupLongitude: trip.pickupLongitude,
      destinationAddress: trip.destinationAddress,
      destinationLatitude: trip.destinationLatitude,
      destinationLongitude: trip.destinationLongitude,
      estimatedDistanceKm: trip.estimatedDistanceKm,
      estimatedDurationMin: trip.estimatedDurationMin,
      estimatedFareKobo: trip.estimatedFareKobo,
      finalFareKobo: trip.finalFareKobo,
      status: trip.status,
      tripPinLastFour: trip.tripPinLastFour,
      cancellationReason: trip.cancellationReason,
      customerNote: trip.customerNote,
      driverNote: trip.driverNote,
      isTestMode: trip.isTestMode,
      requestedAt: trip.requestedAt.toISOString(),
      acceptedAt: trip.acceptedAt?.toISOString() ?? null,
      arrivedAtPickupAt: trip.arrivedAtPickupAt?.toISOString() ?? null,
      startedAt: trip.startedAt?.toISOString() ?? null,
      arrivedAtDestinationAt: trip.arrivedAtDestinationAt?.toISOString() ?? null,
      completedAt: trip.completedAt?.toISOString() ?? null,
      cancelledAt: trip.cancelledAt?.toISOString() ?? null,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      customer: trip.customer ? {
        id: trip.customer.id,
        fullName: trip.customer.user.fullName,
        phoneNumber: trip.customer.user.phoneNumber
      } : null,
      driver: trip.driverProfile ? this.formatDriverProfile(trip.driverProfile) : null,
      events: trip.events.map((event) => ({
        id: event.id,
        actorType: event.actorType,
        actorId: event.actorId,
        eventType: event.eventType,
        note: event.note,
        createdAt: event.createdAt.toISOString()
      })),
      testModeNotice: this.testModeNotice()
    };
  }

  private formatDriverProfile(profile: TaxiDriverProfileForResponse) {
    return {
      id: profile.id,
      userId: profile.userId,
      applicationId: profile.applicationId,
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber,
      city: profile.city,
      state: profile.state,
      vehicleMake: profile.vehicleMake,
      vehicleModel: profile.vehicleModel,
      vehicleYear: profile.vehicleYear,
      vehicleColour: profile.vehicleColour,
      vehiclePlateNumber: profile.vehiclePlateNumber,
      vehicleType: profile.vehicleType,
      status: profile.status,
      isAvailableForTaxi: profile.isAvailableForTaxi,
      lastKnownLatitude: profile.lastKnownLatitude,
      lastKnownLongitude: profile.lastKnownLongitude,
      lastSeenAt: profile.lastSeenAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      testModeOnly: true
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
      applicantAccount: application.applicant ? {
        id: application.applicant.id,
        accountStatus: application.applicant.accountStatus,
        phoneVerified: application.applicant.phoneVerified,
        passwordCreated: Boolean(application.applicant.onboardingPasswordSetAt),
        riderProfile: application.applicant.rider
      } : null,
      documentEvidence: this.rideDocumentEvidence(application),
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
      applicantAccount: application.applicant ? {
        id: application.applicant.id,
        accountStatus: application.applicant.accountStatus,
        phoneVerified: application.applicant.phoneVerified,
        passwordCreated: Boolean(application.applicant.onboardingPasswordSetAt),
        riderProfile: application.applicant.rider
      } : null,
      documentEvidence: this.rideDocumentEvidence(application),
      readinessOnly: true,
      launchWarning: "Approval records Ride Captain review status only. Ride dispatch remains controlled by KariGO operations."
    };
  }

  private rideDocumentEvidence(application: Pick<Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_DETAIL_SELECT }>, "driverLicenceDocumentUrl" | "vehicleParticularsDocumentUrl" | "insuranceDocumentUrl">) {
    return [
      application.driverLicenceDocumentUrl ? { label: "Driver licence image", url: application.driverLicenceDocumentUrl } : null,
      application.vehicleParticularsDocumentUrl ? { label: "Vehicle particulars", url: application.vehicleParticularsDocumentUrl } : null,
      application.insuranceDocumentUrl ? { label: "Insurance document", url: application.insuranceDocumentUrl } : null
    ].filter((document): document is { label: string; url: string } => Boolean(document));
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
      SUBMITTED: "Your Ride Captain application has been submitted for review.",
      UNDER_REVIEW: "Your Ride Captain application is under review.",
      CHANGES_REQUESTED: "KariGO needs more information before continuing your Ride Captain review.",
      PROVISIONALLY_APPROVED: "Your application is provisionally approved for Ride Captain review. Ride dispatch still requires operations approval.",
      APPROVED: "Your Ride Captain application is approved for review records. Ride dispatch is still controlled by KariGO operations.",
      REJECTED: "Your Ride Captain application was not approved at this time."
    };
    return messages[status];
  }
}
