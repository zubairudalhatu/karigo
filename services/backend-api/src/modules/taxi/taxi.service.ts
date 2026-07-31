import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TaxiTripLifecycleDefinition } from "@karigo/shared-types";
import {
  AccountStatus,
  CaptainApplicationDocumentType,
  CaptainDocumentUploadStatus,
  Prisma,
  RiderStatus,
  TaxiApplicationStatus,
  TaxiDriverProfileStatus,
  TaxiTripActorType,
  TaxiTripStatus,
  TaxiVehicleType,
  TaxiWaitlistStatus,
  UserRole
} from "@prisma/client";
import { captainServiceAreas } from "@karigo/shared-types";
import * as bcrypt from "bcrypt";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { assertFutureLicenceDate, resolveCaptainLocation, resolveVehicleDetails } from "../platform/captain-catalog.validation";
import { CaptainUploadStorageService } from "../riders/captain-upload-storage.service";
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
import {
  activeRideServiceAreas,
  assertSameActiveRideServiceArea,
  INTERCITY_RIDES_UNAVAILABLE_MESSAGE,
  rideCityFromText,
  validRideCoordinate
} from "./taxi-service-areas";

const TAXI_APPLICATION_LIST_SELECT = {
  id: true,
  applicationReference: true,
  applicantUserId: true,
  fullName: true,
  phoneNumber: true,
  city: true,
  state: true,
  residentialStateCode: true,
  residentialCityCode: true,
  operatingAreaIds: true,
  primaryOperatingAreaId: true,
  vehicleMake: true,
  vehicleModel: true,
  vehicleYear: true,
  vehicleColour: true,
  vehicleCustomMake: true,
  vehicleCustomModel: true,
  vehicleCustomColour: true,
  vehiclePlateNumber: true,
  driverLicenceDocumentUrl: true,
  vehicleParticularsDocumentUrl: true,
  insuranceDocumentUrl: true,
  vehicleType: true,
  vehicleOwnership: true,
  applicant: { select: { id: true, role: true, phoneNumber: true, accountStatus: true, deletedAt: true, phoneVerified: true, onboardingPasswordSetAt: true, rider: { select: { id: true, riderCode: true, verificationStatus: true } } } },
  status: true,
  applicantVisibleNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  captainDocuments: { orderBy: { uploadedAt: "desc" } }
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
  applicant: { select: { id: true, role: true, phoneNumber: true, accountStatus: true, deletedAt: true, phoneVerified: true, onboardingPasswordSetAt: true, rider: { select: { id: true, riderCode: true, verificationStatus: true } } } },
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
type TaxiTripViewer = "customer" | "driver" | "admin" | "internal";

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
  TaxiTripStatus.REQUESTED,
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED,
  TaxiTripStatus.ARRIVED_PICKUP,
  TaxiTripStatus.STARTED,
  TaxiTripStatus.ARRIVED_DESTINATION
];

const CUSTOMER_CANCELLABLE_TAXI_TRIP_STATUSES: TaxiTripStatus[] = [
  TaxiTripStatus.REQUESTED,
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED
];

const CLOSED_TAXI_TRIP_STATUSES: TaxiTripStatus[] = [
  TaxiTripStatus.COMPLETED,
  TaxiTripStatus.CANCELLED_BY_ADMIN,
  TaxiTripStatus.CANCELLED_BY_CUSTOMER,
  TaxiTripStatus.CANCELLED_BY_DRIVER,
  TaxiTripStatus.EXPIRED
];

const RIDE_CATEGORIES = [
  {
    id: "ECONOMY",
    name: "KariGO Economy",
    description: "Affordable everyday rides for up to 4 passengers.",
    passengerCapacity: 4,
    arrivalEstimateMinutes: 8,
    fareMultiplier: 1
  },
  {
    id: "COMFORT",
    name: "KariGO Comfort",
    description: "Newer vehicles and extra comfort for daily movement.",
    passengerCapacity: 4,
    arrivalEstimateMinutes: 10,
    fareMultiplier: 1.25
  },
  {
    id: "EXECUTIVE",
    name: "KariGO Executive",
    description: "Premium ride review category for approved vehicles.",
    passengerCapacity: 4,
    arrivalEstimateMinutes: 12,
    fareMultiplier: 1.6
  },
  {
    id: "XL",
    name: "KariGO XL",
    description: "Larger vehicle option for groups and extra space.",
    passengerCapacity: 6,
    arrivalEstimateMinutes: 15,
    fareMultiplier: 1.8
  }
];

@Injectable()
export class TaxiService {
  private readonly logger = new Logger(TaxiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly config: ConfigService,
    private readonly captainUploadStorage: CaptainUploadStorageService,
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
      ? await this.requireApplicantUserById(applicantUserId, phoneNumber)
      : await this.requireApplicantAccount(phoneNumber);
    const duplicate = await this.findActiveDuplicateApplication(applicant.id, phoneNumber);
    if (duplicate) return this.formatPublicApplicationStatus(duplicate);
    const location = this.resolveRideApplicationLocation(dto, Boolean(applicantUserId));
    const vehicle = resolveVehicleDetails(dto);
    const licenceExpiry = assertFutureLicenceDate(dto.driverLicenceExpiry);
    const uploadedDocuments = applicantUserId
      ? await this.requireCaptainDocuments(applicant.id, dto.documentIds, this.requiredRideDocumentTypes())
      : [];
    if (!applicantUserId && (!dto.driverLicenceDocumentUrl?.trim() || !dto.vehicleParticularsDocumentUrl?.trim())) {
      throw new BadRequestException("Ride Captain review requires driver licence and vehicle particulars document links.");
    }

    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.taxiDriverApplication.create({
        data: {
          applicationReference: await this.nextApplicationReference(),
          applicantUserId: applicant.id,
          fullName: dto.fullName.trim(),
          phoneNumber,
          email: dto.email?.trim().toLowerCase(),
          city: location.city,
          state: location.state,
          residentialStateCode: location.residentialStateCode,
          residentialCityCode: location.residentialCityCode,
          operatingAreaIds: location.operatingAreaIds,
          primaryOperatingAreaId: location.primaryOperatingAreaId,
          address: dto.address?.trim(),
          driverLicenceNumber: dto.driverLicenceNumber?.trim(),
          driverLicenceDocumentUrl: dto.driverLicenceDocumentUrl?.trim(),
          driverLicenceExpiry: licenceExpiry,
          vehicleMake: vehicle.vehicleMake,
          vehicleModel: vehicle.vehicleModel,
          vehicleYear: vehicle.vehicleYear,
          vehicleColour: vehicle.vehicleColour,
          vehicleCustomMake: vehicle.vehicleCustomMake,
          vehicleCustomModel: vehicle.vehicleCustomModel,
          vehicleCustomColour: vehicle.vehicleCustomColour,
          vehiclePlateNumber: dto.vehiclePlateNumber?.trim(),
          vehicleType: dto.vehicleType,
          vehicleOwnership: dto.vehicleOwnership,
          vehicleParticularsDocumentUrl: dto.vehicleParticularsDocumentUrl?.trim(),
          insuranceDocumentUrl: dto.insuranceDocumentUrl?.trim(),
          notes: dto.notes?.trim()
        },
        select: { id: true }
      });
      if (uploadedDocuments.length) {
        await tx.captainApplicationDocument.updateMany({
          where: { id: { in: uploadedDocuments.map((document) => document.id) }, userId: applicant.id },
          data: { rideApplicationId: created.id }
        });
      }
      return tx.taxiDriverApplication.findUniqueOrThrow({
        where: { id: created.id },
        select: TAXI_APPLICATION_DETAIL_SELECT
      });
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

  async currentUserApplicationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, phoneNumber: true, email: true, deletedAt: true }
    });
    if (!user || user.deletedAt) throw new NotFoundException("KariGO account not found");

    const application = await this.prisma.taxiDriverApplication.findFirst({
      where: {
        OR: [
          { applicantUserId: user.id },
          { phoneNumber: user.phoneNumber }
        ]
      },
      select: TAXI_APPLICATION_DETAIL_SELECT,
      orderBy: { createdAt: "desc" }
    });

    if (application) return { exists: true, ...this.formatPublicApplicationStatus(application) };

    return {
      exists: false,
      nextStep: "SUBMIT_APPLICATION",
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      message: "You are signed in with your KariGO account. Complete your Captain application to start onboarding.",
      readinessOnly: true
    };
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
      if (dto.status === TaxiApplicationStatus.APPROVED && this.applicantReadyForRideApproval(current.applicant)) {
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

  rideCategories(city?: string) {
    this.assertTaxiStagingEnabled();
    return this.enabledRideCategories(city).map((category) => this.formatRideCategory(category));
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
      const activeTrip = await tx.taxiTrip.findFirst({
        where: {
          customerId: customer.id,
          status: { in: ACTIVE_TAXI_TRIP_STATUSES }
        },
        include: this.tripInclude(),
        orderBy: [
          { updatedAt: "desc" },
          { createdAt: "desc" }
        ]
      });
      if (activeTrip) {
        this.throwActiveRideConflict(activeTrip);
      }

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
          tripPinEncrypted: this.encryptTripPin(tripPin),
          tripPinLastFour: tripPin.slice(-4),
          customerNote: this.composeTripCustomerNote(dto),
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
            rideCategory: dto.rideCategory?.trim() || "ECONOMY",
            paymentMethod: dto.paymentMethod?.trim() || "Cash",
            scheduledPickupAt: dto.scheduledPickupAt?.trim() || null,
            clientRequestId: dto.clientRequestId?.trim() || null,
            pricing: estimate.pricing
          } as Prisma.InputJsonValue
        }
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.formatTrip(trip, { viewer: "customer" });
  }

  async customerTrips(userId: string) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trips = await this.prisma.taxiTrip.findMany({
      where: { customerId: customer.id },
      include: this.tripInclude(),
      orderBy: { createdAt: "desc" }
    });
    return trips.map((trip) => this.formatTrip(trip, { viewer: "customer" }));
  }

  async customerTrip(userId: string, tripId: string) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trip = await this.prisma.taxiTrip.findFirst({
      where: { id: tripId, customerId: customer.id },
      include: this.tripInclude()
    });
    if (!trip) throw new NotFoundException("Ride request not found");
    return this.formatTrip(trip, { viewer: "customer" });
  }

  async customerCancelTrip(userId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const customer = await this.requireCustomer(userId);
    const trip = await this.prisma.taxiTrip.findFirst({
      where: { id: tripId, customerId: customer.id },
      include: this.tripInclude()
    });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (trip.status === TaxiTripStatus.CANCELLED_BY_CUSTOMER) {
      return this.formatTrip(trip, { viewer: "customer" });
    }
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    if (!CUSTOMER_CANCELLABLE_TAXI_TRIP_STATUSES.includes(trip.status)) {
      throw new BadRequestException("Contact support to cancel an active Ride request");
    }
    return this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_CUSTOMER, userId, TaxiTripActorType.CUSTOMER, dto.reason, "customer");
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
        driverProfileId: profile.id,
        status: { in: ACTIVE_TAXI_TRIP_STATUSES }
      },
      include: this.tripInclude(),
      orderBy: { createdAt: "asc" },
      take: 20
    });
    return trips.map((trip) => this.formatTrip(trip, { viewer: "driver" }));
  }

  async acceptTaxiTrip(userId: string, tripId: string) {
    this.assertTaxiStagingEnabled();
    const profile = await this.requireActiveTaxiDriverProfile(userId);
    await this.assertDriverHasNoActiveTrip(profile.id, tripId);
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (!trip.driverProfileId) {
      throw new BadRequestException("Ride request must be manually assigned by KariGO Operations before it can be accepted");
    }
    if (trip.driverProfileId !== profile.id) throw new ConflictException("Ride request is assigned to another Captain");
    if (trip.status !== TaxiTripStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException("Ride request must be assigned before it can be accepted");
    }
    const updated = await this.updateTripWithEvent(trip.id, {
      status: TaxiTripStatus.ACCEPTED,
      acceptedAt: new Date()
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.accepted", "Ride Captain accepted ride request");
    return this.formatTrip(updated, { viewer: "driver" });
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
      startedAt: new Date(),
      tripPinHash: null,
      tripPinEncrypted: null
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.started", `Ride Captain ${profile.fullName} started ride request`);
    return this.formatTrip(updated, { viewer: "driver" });
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
      tripPinHash: null,
      tripPinEncrypted: null
    }, userId, TaxiTripActorType.DRIVER, "taxi.trip.completed", "Ride request completed");
    return this.formatTrip(updated, { viewer: "driver" });
  }

  async riderCancelTrip(userId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const { trip } = await this.requireDriverTrip(userId, tripId);
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    return this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_DRIVER, userId, TaxiTripActorType.DRIVER, dto.reason, "driver");
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
      controlledPilot: true
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
      controlledPilot: true
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
    return trips.map((trip) => this.formatTrip(trip, { viewer: "admin" }));
  }

  async adminTrip(tripId: string) {
    this.assertTaxiStagingEnabled();
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId }, include: this.tripInclude() });
    if (!trip) throw new NotFoundException("Ride request not found");
    return this.formatTrip(trip, { viewer: "admin" });
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
      controlledPilot: true
    });
    return this.formatTrip(updated, { viewer: "admin" });
  }

  async adminCancelTrip(adminUserId: string, tripId: string, dto: TaxiCancelDto) {
    this.assertTaxiStagingEnabled();
    const trip = await this.prisma.taxiTrip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException("Ride request not found");
    if (CLOSED_TAXI_TRIP_STATUSES.includes(trip.status)) throw new BadRequestException("Ride request is already closed");
    const updated = await this.cancelTrip(trip.id, TaxiTripStatus.CANCELLED_BY_ADMIN, adminUserId, TaxiTripActorType.ADMIN, dto.reason, "admin");
    await this.audit.record(adminUserId, "admin.taxi.trip.cancelled", "TaxiTrip", trip.id, {
      reason: dto.reason,
      controlledPilot: true
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
        phoneNumber: true,
        accountStatus: true,
        phoneVerified: true,
        onboardingPasswordSetAt: true,
        deletedAt: true
      }
    });
    if (!applicant || applicant.deletedAt) {
      throw new BadRequestException("Create a Captain applicant account before submitting the Ride Captain application.");
    }
    if (applicant.role === UserRole.CUSTOMER) {
      throw new BadRequestException("This phone number already has a KariGO account. Sign in with your existing KariGO password to continue your Captain application.");
    }
    if (applicant.role !== UserRole.RIDER) {
      throw new BadRequestException("This KariGO account is not eligible for Ride Captain onboarding from the Captain app.");
    }
    if (!applicant.phoneVerified) {
      throw new BadRequestException("Verify the Captain applicant phone number before submitting the Ride Captain application.");
    }
    if (!applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Create the Captain applicant password before submitting the Ride Captain application.");
    }
    return applicant;
  }

  private async requireApplicantUserById(applicantUserId: string, phoneNumber: string) {
    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantUserId },
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
      throw new BadRequestException("Captain applicant account is not ready for application submission.");
    }
    if (applicant.phoneNumber !== phoneNumber) {
      throw new BadRequestException("Use your signed-in KariGO account phone number for this Captain application.");
    }
    if (applicant.role === UserRole.CUSTOMER) {
      if (!applicant.phoneVerified || applicant.accountStatus !== AccountStatus.ACTIVE) {
        throw new BadRequestException("Sign in with an active verified KariGO Customer account before continuing Captain onboarding.");
      }
      return applicant;
    }
    if (applicant.role !== UserRole.RIDER || !applicant.phoneVerified || !applicant.onboardingPasswordSetAt) {
      throw new BadRequestException("Captain applicant account is not ready for application submission.");
    }
    return applicant;
  }

  private async findActiveDuplicateApplication(applicantUserId: string, phoneNumber: string) {
    return this.prisma.taxiDriverApplication.findFirst({
      where: {
        status: { not: TaxiApplicationStatus.REJECTED },
        OR: [
          { applicantUserId },
          { phoneNumber }
        ]
      },
      select: TAXI_APPLICATION_DETAIL_SELECT,
      orderBy: { createdAt: "desc" }
    });
  }

  private applicantReadyForRideApproval(
    applicant: Prisma.TaxiDriverApplicationGetPayload<{ select: typeof TAXI_APPLICATION_DETAIL_SELECT }>["applicant"]
  ) {
    if (!applicant || applicant.deletedAt || !applicant.phoneVerified) return false;
    if (applicant.role === UserRole.CUSTOMER) return applicant.accountStatus === AccountStatus.ACTIVE;
    return applicant.role === UserRole.RIDER && Boolean(applicant.onboardingPasswordSetAt);
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
    if (!this.config.get<boolean>("RIDES_SERVICE_ENABLED", this.config.get<boolean>("TAXI_SERVICE_ENABLED", false))) {
      throw new ForbiddenException("KariGO Rides is preparing launch in your area.");
    }
    if (!this.config.get<boolean>("RIDES_CONTROLLED_PILOT_ENABLED", this.config.get<boolean>("TAXI_STAGING_DISPATCH_ENABLED", false))) {
      throw new ForbiddenException("KariGO Rides is preparing launch in your area.");
    }
    if (this.config.get<boolean>("RIDES_AUTO_DISPATCH_ENABLED", false)) {
      throw new ForbiddenException("KariGO Rides auto-dispatch is disabled during controlled pilot.");
    }
    if (this.config.get<boolean>("RIDES_PAYMENT_ENABLED", false)) {
      throw new ForbiddenException("KariGO Rides payment is disabled during controlled pilot.");
    }
  }

  private calculateFare(dto: TaxiFareEstimateDto) {
    this.assertFareServiceArea(dto);
    const distance = Number(dto.estimatedDistanceKm ?? 5);
    const duration = Math.round(Number(dto.estimatedDurationMin ?? Math.max(10, distance * 4)));
    const waitingMinutes = Math.max(0, Math.round(Number(dto.waitingMinutes ?? 0)));
    if (!Number.isFinite(distance) || distance <= 0) throw new BadRequestException("Estimated distance must be greater than zero");
    if (!Number.isFinite(duration) || duration <= 0) throw new BadRequestException("Estimated duration must be greater than zero");
    if (!Number.isFinite(waitingMinutes)) throw new BadRequestException("Waiting minutes must be a valid number");

    const pricing = this.ridePricingDefaults();
    const categories = this.enabledRideCategories();
    const selectedCategory = categories.find((category) => category.id === (dto.rideCategory?.trim().toUpperCase() || "ECONOMY")) ?? categories[0];
    const billableWaitingMinutes = Math.max(0, waitingMinutes - pricing.waitingGraceMinutes);
    const distanceFareKobo = Math.round(distance * pricing.perKmKobo);
    const waitingChargeKobo = billableWaitingMinutes * pricing.waitingChargeKoboPerMinute;
    const baseFareKobo = distanceFareKobo + waitingChargeKobo;
    const estimatedFareKobo = Math.round(baseFareKobo * selectedCategory.fareMultiplier);
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
      selectedRideCategory: this.formatRideCategory(selectedCategory, estimatedFareKobo),
      rideCategories: categories.map((category) => this.formatRideCategory(category, Math.round(baseFareKobo * category.fareMultiplier))),
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

  private enabledRideCategories(_city?: string) {
    return RIDE_CATEGORIES;
  }

  private formatRideCategory(category: (typeof RIDE_CATEGORIES)[number], fareEstimateKobo?: number) {
    const fareMin = fareEstimateKobo ? Math.round(fareEstimateKobo * 0.95) : undefined;
    const fareMax = fareEstimateKobo ? Math.round(fareEstimateKobo * 1.08) : undefined;
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      passengerCapacity: category.passengerCapacity,
      arrivalEstimateMinutes: category.arrivalEstimateMinutes,
      fareEstimateKobo,
      fareRangeKobo: fareMin && fareMax ? { min: fareMin, max: fareMax } : undefined,
      available: true,
      controlledPilotOnly: true
    };
  }

  private composeTripCustomerNote(dto: CreateTaxiTripDto) {
    return [
      dto.customerNote?.trim(),
      dto.stopAddress?.trim() ? `Stop: ${dto.stopAddress.trim()}` : null,
      dto.rideCategory?.trim() ? `Ride category: ${dto.rideCategory.trim().toUpperCase()}` : null,
      dto.paymentMethod?.trim() ? `Payment preference: ${dto.paymentMethod.trim()}` : null,
      dto.scheduledPickupAt?.trim() ? `Scheduled pickup: ${dto.scheduledPickupAt.trim()}` : null,
      dto.pickupInstruction?.trim() ? `Pickup instruction: ${dto.pickupInstruction.trim()}` : null
    ].filter(Boolean).join("\n") || undefined;
  }

  private ridePricingDefaults() {
    const vatTaxKobo = this.config.get<number>("RIDE_VAT_TAX_KOBO", 0);
    return {
      launchCities: activeRideServiceAreas(this.config).map((area) => area.city),
      perKmKobo: this.config.get<number>("RIDE_PER_KM_KOBO", 40000),
      karigoCommissionPercent: this.config.get<number>("RIDE_CAPTAIN_COMMISSION_PERCENT", 10),
      waitingChargeKoboPerMinute: this.config.get<number>("RIDE_WAITING_CHARGE_KOBO_PER_MINUTE", 500),
      waitingGraceMinutes: this.config.get<number>("RIDE_WAITING_GRACE_MINUTES", 5),
      vatTaxKobo,
      vatTaxConfigured: vatTaxKobo > 0,
      dispatchEnabled: this.config.get<boolean>("RIDES_CONTROLLED_PILOT_ENABLED", this.config.get<boolean>("TAXI_STAGING_DISPATCH_ENABLED", false))
    };
  }

  private testModeNotice() {
    return "KariGO Rides is available for controlled pilot testing in selected areas. Manual assignment is required; ride payment and payout automation remain disabled.";
  }

  private decimalOrUndefined(value?: number) {
    return value === undefined || value === null ? undefined : new Prisma.Decimal(value);
  }

  private assertFareServiceArea(dto: TaxiFareEstimateDto) {
    const pickupHasCoordinate = validRideCoordinate(dto.pickupLatitude, dto.pickupLongitude);
    const destinationHasCoordinate = validRideCoordinate(dto.destinationLatitude, dto.destinationLongitude);
    const stopHasCoordinate = validRideCoordinate(dto.stopLatitude, dto.stopLongitude);
    const hasPartialStop = dto.stopLatitude !== undefined || dto.stopLongitude !== undefined || Boolean(dto.stopAddress?.trim());

    if (pickupHasCoordinate && destinationHasCoordinate) {
      assertSameActiveRideServiceArea(
        this.config,
        { latitude: dto.pickupLatitude!, longitude: dto.pickupLongitude! },
        { latitude: dto.destinationLatitude!, longitude: dto.destinationLongitude! },
        stopHasCoordinate ? { latitude: dto.stopLatitude!, longitude: dto.stopLongitude! } : null
      );
      return;
    }

    if (hasPartialStop && !stopHasCoordinate) {
      throw new BadRequestException("Choose a valid stop location from search results or the map.");
    }

    const pickupCity = rideCityFromText(this.config, dto.pickupAddress);
    const destinationCity = rideCityFromText(this.config, dto.destinationAddress);
    const stopCity = rideCityFromText(this.config, dto.stopAddress);
    if (pickupCity && destinationCity && pickupCity !== destinationCity) {
      throw new BadRequestException(INTERCITY_RIDES_UNAVAILABLE_MESSAGE);
    }
    if (stopCity && pickupCity && stopCity !== pickupCity) {
      throw new BadRequestException(INTERCITY_RIDES_UNAVAILABLE_MESSAGE);
    }
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException("Customer profile not found");
    return customer;
  }

  private async requireActiveTaxiDriverProfile(userId: string) {
    const profile = await this.prisma.taxiDriverProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException("Ride operations will be available after KariGO approves your Captain account.");
    if (profile.status !== TaxiDriverProfileStatus.ACTIVE_TEST) {
      throw new ForbiddenException("Ride operations will be available after KariGO approves your Captain account.");
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

  private throwActiveRideConflict(trip: TaxiTripWithRelations): never {
    throw new ConflictException({
      message: "You already have an active KariGO Ride. View or cancel it before requesting another immediate ride.",
      error_code: "ACTIVE_RIDE_EXISTS",
      details: {
        activeTrip: this.formatTrip(trip, { viewer: "customer" })
      }
    });
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
    return this.formatTrip(updated, { viewer: "driver" });
  }

  private async cancelTrip(tripId: string, status: TaxiTripStatus, actorId: string, actorType: TaxiTripActorType, reason?: string, viewer: TaxiTripViewer = "internal") {
    const updated = await this.updateTripWithEvent(tripId, {
      status,
      cancellationReason: reason?.trim() || "Ride request cancelled",
      cancelledAt: new Date(),
      tripPinHash: null,
      tripPinEncrypted: null
    }, actorId, actorType, "taxi.trip.cancelled", reason || "Ride request cancelled");
    return this.formatTrip(updated, { viewer });
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

  private formatTrip(trip: TaxiTripWithRelations, options: { viewer?: TaxiTripViewer } = {}) {
    const viewer = options.viewer ?? "internal";
    const lifecycle = this.lifecycleForStatus(trip.status);
    const assignmentIncomplete = this.assignmentIncomplete(trip);
    if (assignmentIncomplete) {
      this.logger.warn(`Ride assignment incomplete tripId=${trip.id} status=${trip.status}`);
    }
    const showPublicCaptain = Boolean(lifecycle.captainVisible && trip.driverProfile && !assignmentIncomplete);
    const tripPin = viewer === "customer" && lifecycle.pickupPinVisible ? this.decryptTripPin(trip) : undefined;
    const assignedAt = this.tripEventTime(trip, "taxi.trip.driver_assigned");
    const lifecycleTimestamps = {
      requestedAt: trip.requestedAt?.toISOString() ?? null,
      assignedAt,
      acceptedAt: trip.acceptedAt?.toISOString() ?? null,
      arrivedAtPickupAt: trip.arrivedAtPickupAt?.toISOString() ?? null,
      startedAt: trip.startedAt?.toISOString() ?? null,
      arrivedAtDestinationAt: trip.arrivedAtDestinationAt?.toISOString() ?? null,
      completedAt: trip.completedAt?.toISOString() ?? null,
      cancelledAt: trip.cancelledAt?.toISOString() ?? null,
      expiredAt: trip.status === TaxiTripStatus.EXPIRED ? trip.updatedAt.toISOString() : null
    };

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
      tripPinLastFour: viewer === "admin" || lifecycle.pickupPinVisible ? trip.tripPinLastFour : null,
      ...(tripPin ? { tripPin } : {}),
      lifecycle,
      captain: showPublicCaptain && trip.driverProfile ? this.formatCaptainSummary(trip.driverProfile) : null,
      vehicle: showPublicCaptain && trip.driverProfile ? this.formatVehicleSummary(trip.driverProfile) : null,
      assignmentIncomplete,
      lifecycleTimestamps,
      timeline: this.tripTimeline(trip, lifecycleTimestamps),
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

  private lifecycleForStatus(status: TaxiTripStatus): TaxiTripLifecycleDefinition {
    const sharedStatus = status as TaxiTripLifecycleDefinition["status"];
    const base = {
      status: sharedStatus,
      active: ACTIVE_TAXI_TRIP_STATUSES.includes(status),
      terminal: CLOSED_TAXI_TRIP_STATUSES.includes(status),
      customerCancellationAllowed: CUSTOMER_CANCELLABLE_TAXI_TRIP_STATUSES.includes(status),
      bookAnotherAllowed: CLOSED_TAXI_TRIP_STATUSES.includes(status)
    };
    const definitions: Record<TaxiTripStatus, Omit<TaxiTripLifecycleDefinition, keyof typeof base> & { status?: never; active?: never; terminal?: never; customerCancellationAllowed?: never; bookAnotherAllowed?: never }> = {
      REQUESTED: {
        order: 1,
        customerTitle: "Looking for a Ride Captain",
        customerCopy: "Connecting you with available Captains nearby.",
        captainVisible: false,
        vehicleVisible: false,
        pickupPinVisible: false,
        pollingAllowed: true,
        pollingIntervalMs: 12000,
        receiptAvailable: false
      },
      DRIVER_ASSIGNED: {
        order: 2,
        customerTitle: "Ride Captain assigned",
        customerCopy: "Your Ride Captain has been assigned and is preparing to accept the request.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: true,
        pollingIntervalMs: 8000,
        receiptAvailable: false
      },
      ACCEPTED: {
        order: 3,
        customerTitle: "Your Ride Captain is on the way",
        customerCopy: "Your Ride Captain accepted the request and is heading to pickup.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: true,
        pollingIntervalMs: 7000,
        receiptAvailable: false
      },
      ARRIVED_PICKUP: {
        order: 4,
        customerTitle: "Your Ride Captain has arrived",
        customerCopy: "Meet your approved KariGO Ride Captain at pickup and share the protected PIN only when you are ready to start.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: true,
        pollingAllowed: true,
        pollingIntervalMs: 10000,
        receiptAvailable: false
      },
      STARTED: {
        order: 5,
        customerTitle: "Ride in progress",
        customerCopy: "Your KariGO Ride is in progress.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: true,
        pollingIntervalMs: 9000,
        receiptAvailable: false
      },
      ARRIVED_DESTINATION: {
        order: 6,
        customerTitle: "Destination reached",
        customerCopy: "Your Ride has reached the destination. KariGO will confirm completion once the Captain closes the trip.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: true,
        pollingIntervalMs: 10000,
        receiptAvailable: false
      },
      COMPLETED: {
        order: 7,
        customerTitle: "Ride completed",
        customerCopy: "Thanks for riding with KariGO.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: false,
        pollingIntervalMs: 0,
        receiptAvailable: true
      },
      CANCELLED_BY_CUSTOMER: {
        order: 8,
        customerTitle: "Ride request cancelled",
        customerCopy: "This Ride request was cancelled by the customer.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: false,
        pollingIntervalMs: 0,
        receiptAvailable: true
      },
      CANCELLED_BY_DRIVER: {
        order: 8,
        customerTitle: "Ride request cancelled",
        customerCopy: "This Ride request was cancelled by the Ride Captain.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: false,
        pollingIntervalMs: 0,
        receiptAvailable: true
      },
      CANCELLED_BY_ADMIN: {
        order: 8,
        customerTitle: "Ride request cancelled",
        customerCopy: "This Ride request was closed by KariGO Operations.",
        captainVisible: true,
        vehicleVisible: true,
        pickupPinVisible: false,
        pollingAllowed: false,
        pollingIntervalMs: 0,
        receiptAvailable: true
      },
      EXPIRED: {
        order: 8,
        customerTitle: "Ride request expired",
        customerCopy: "No Ride Captain accepted before the request expired.",
        captainVisible: false,
        vehicleVisible: false,
        pickupPinVisible: false,
        pollingAllowed: false,
        pollingIntervalMs: 0,
        receiptAvailable: true
      }
    };
    return { ...base, ...definitions[status] };
  }

  private assignmentIncomplete(trip: TaxiTripWithRelations) {
    const statusesRequiringCaptain: TaxiTripStatus[] = [
      TaxiTripStatus.DRIVER_ASSIGNED,
      TaxiTripStatus.ACCEPTED,
      TaxiTripStatus.ARRIVED_PICKUP,
      TaxiTripStatus.STARTED,
      TaxiTripStatus.ARRIVED_DESTINATION,
      TaxiTripStatus.COMPLETED,
      TaxiTripStatus.CANCELLED_BY_DRIVER
    ];
    return statusesRequiringCaptain.includes(trip.status) && !trip.driverProfile;
  }

  private formatCaptainSummary(profile: TaxiDriverProfileForResponse) {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.fullName,
      profilePhotoUrl: null,
      verified: profile.status === TaxiDriverProfileStatus.ACTIVE_TEST,
      publicRating: null,
      completedTripCount: null,
      contactAvailable: Boolean(profile.phoneNumber),
      contactPhoneNumber: profile.phoneNumber || null,
      location: this.formatCaptainLocation(profile)
    };
  }

  private formatVehicleSummary(profile: TaxiDriverProfileForResponse) {
    return {
      make: profile.vehicleMake,
      model: profile.vehicleModel,
      colour: profile.vehicleColour,
      registrationNumber: profile.vehiclePlateNumber,
      category: profile.vehicleType,
      seatCapacity: this.vehicleSeatCapacity(profile.vehicleType),
      photoUrl: null
    };
  }

  private formatCaptainLocation(profile: TaxiDriverProfileForResponse) {
    if (!profile.lastKnownLatitude || !profile.lastKnownLongitude || !profile.lastSeenAt) return null;
    const ageMs = Date.now() - profile.lastSeenAt.getTime();
    const freshness = ageMs <= 120_000 ? "fresh" : "stale";
    return {
      latitude: profile.lastKnownLatitude,
      longitude: profile.lastKnownLongitude,
      lastSeenAt: profile.lastSeenAt.toISOString(),
      freshness
    };
  }

  private vehicleSeatCapacity(type: TaxiVehicleType | null) {
    if (type === TaxiVehicleType.SEDAN) return 4;
    if (type === TaxiVehicleType.SUV) return 4;
    if (type === TaxiVehicleType.MINI_BUS) return 10;
    if (type === TaxiVehicleType.TRICYCLE) return 3;
    return null;
  }

  private tripEventTime(trip: TaxiTripWithRelations, eventType: string) {
    return trip.events.find((event) => event.eventType === eventType)?.createdAt.toISOString() ?? null;
  }

  private tripTimeline(trip: TaxiTripWithRelations, timestamps: {
    requestedAt?: string | null;
    assignedAt?: string | null;
    acceptedAt?: string | null;
    arrivedAtPickupAt?: string | null;
    startedAt?: string | null;
    arrivedAtDestinationAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
    expiredAt?: string | null;
  }) {
    const candidates = [
      { key: "requested", label: "Requested", status: TaxiTripStatus.REQUESTED, timestamp: timestamps.requestedAt },
      { key: "assigned", label: "Captain assigned", status: TaxiTripStatus.DRIVER_ASSIGNED, timestamp: timestamps.assignedAt },
      { key: "accepted", label: "Captain accepted", status: TaxiTripStatus.ACCEPTED, timestamp: timestamps.acceptedAt },
      { key: "arrived_pickup", label: "Captain arrived", status: TaxiTripStatus.ARRIVED_PICKUP, timestamp: timestamps.arrivedAtPickupAt },
      { key: "started", label: "Ride started", status: TaxiTripStatus.STARTED, timestamp: timestamps.startedAt },
      { key: "arrived_destination", label: "Destination reached", status: TaxiTripStatus.ARRIVED_DESTINATION, timestamp: timestamps.arrivedAtDestinationAt },
      { key: "completed", label: "Completed", status: TaxiTripStatus.COMPLETED, timestamp: timestamps.completedAt },
      { key: "cancelled_customer", label: "Cancelled by customer", status: TaxiTripStatus.CANCELLED_BY_CUSTOMER, timestamp: timestamps.cancelledAt },
      { key: "cancelled_captain", label: "Cancelled by Ride Captain", status: TaxiTripStatus.CANCELLED_BY_DRIVER, timestamp: timestamps.cancelledAt },
      { key: "cancelled_admin", label: "Cancelled by KariGO", status: TaxiTripStatus.CANCELLED_BY_ADMIN, timestamp: timestamps.cancelledAt },
      { key: "expired", label: "Expired", status: TaxiTripStatus.EXPIRED, timestamp: timestamps.expiredAt }
    ];
    return candidates
      .filter((item) => item.timestamp || item.status === trip.status)
      .map((item) => ({
        ...item,
        current: item.status === trip.status
      }));
  }

  private encryptTripPin(pin: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.tripPinEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
  }

  private decryptTripPin(trip: Pick<TaxiTripWithRelations, "id" | "tripPinEncrypted">) {
    if (!trip.tripPinEncrypted) return undefined;
    try {
      const [version, iv, tag, encrypted] = trip.tripPinEncrypted.split(":");
      if (version !== "v1" || !iv || !tag || !encrypted) return undefined;
      const decipher = createDecipheriv("aes-256-gcm", this.tripPinEncryptionKey(), Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final()
      ]).toString("utf8");
    } catch {
      this.logger.warn(`Ride PIN decrypt failed tripId=${trip.id}`);
      return undefined;
    }
  }

  private tripPinEncryptionKey() {
    const secret = this.config.get<string>("RIDE_PIN_ENCRYPTION_SECRET", this.config.get<string>("JWT_SECRET", "karigo-local-ride-pin-secret"));
    return createHash("sha256").update(secret).digest();
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
      testModeOnly: true,
      controlledPilotOnly: true
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

  private resolveRideApplicationLocation(dto: CreateTaxiDriverApplicationDto, strict: boolean) {
    const inferredArea = dto.city?.trim().toLowerCase() === "abuja" ? "fct-abuja" : "kano-kano";
    if (!strict && (!dto.residentialStateCode || !dto.residentialCityCode || !dto.operatingAreaIds?.length || !dto.primaryOperatingAreaId)) {
      return resolveCaptainLocation({
        state: dto.state,
        city: dto.city,
        operatingAreaIds: [inferredArea],
        primaryOperatingAreaId: inferredArea
      });
    }
    return resolveCaptainLocation(dto);
  }

  private requiredRideDocumentTypes(): CaptainApplicationDocumentType[] {
    return [
      CaptainApplicationDocumentType.PROFILE_PHOTO,
      CaptainApplicationDocumentType.DRIVER_LICENCE,
      CaptainApplicationDocumentType.VEHICLE_EXTERIOR,
      CaptainApplicationDocumentType.VEHICLE_INTERIOR,
      CaptainApplicationDocumentType.VEHICLE_LICENCE
    ];
  }

  private async requireCaptainDocuments(userId: string, documentIds: string[] | undefined, requiredTypes: CaptainApplicationDocumentType[]) {
    const ids = Array.from(new Set((documentIds ?? []).map((id) => id.trim()).filter(Boolean)));
    if (!ids.length) {
      throw new BadRequestException({ message: "Required Ride Captain documents are missing.", errorCode: `${requiredTypes[0]}_REQUIRED` });
    }
    const documents = await this.prisma.captainApplicationDocument.findMany({
      where: {
        id: { in: ids },
        userId,
        uploadStatus: CaptainDocumentUploadStatus.UPLOADED,
        deletedAt: null
      }
    });
    if (documents.length !== ids.length) {
      throw new BadRequestException({ message: "One or more Ride Captain documents are incomplete or not owned by this applicant.", errorCode: "DOCUMENT_NOT_OWNED" });
    }
    for (const requiredType of requiredTypes) {
      if (!documents.some((document) => document.documentType === requiredType)) {
        throw new BadRequestException({ message: "Required Ride Captain document is missing.", errorCode: `${requiredType}_REQUIRED` });
      }
    }
    return documents;
  }

  async adminRideCaptainDocumentViewUrl(applicationId: string, documentId: string) {
    const document = await this.prisma.captainApplicationDocument.findFirst({
      where: {
        id: documentId,
        rideApplicationId: applicationId,
        uploadStatus: CaptainDocumentUploadStatus.UPLOADED,
        deletedAt: null
      }
    });
    if (!document) throw new NotFoundException("Ride Captain application document not found");
    const viewUrl = await this.captainUploadStorage.signedViewUrl(document.objectKey, 300);
    return {
      document: this.toAdminCaptainDocument(document),
      viewUrl,
      expiresAt: new Date(Date.now() + 300_000).toISOString()
    };
  }

  private operatingAreaSummary(areaId?: string | null) {
    if (!areaId) return null;
    const area = captainServiceAreas.find((item) => item.id === areaId);
    return area ? {
      id: area.id,
      stateCode: area.stateCode,
      stateName: area.stateName,
      cityCode: area.cityCode,
      cityName: area.cityName,
      label: `${area.cityName}, ${area.stateCode === "FCT" ? "FCT" : area.stateName}`
    } : null;
  }

  private operatingAreaSummaries(areaIds?: string[] | null) {
    return (areaIds ?? [])
      .map((areaId) => this.operatingAreaSummary(areaId))
      .filter((area): area is NonNullable<ReturnType<TaxiService["operatingAreaSummary"]>> => Boolean(area));
  }

  private locationSummary(cityCode?: string | null, stateCode?: string | null, fallbackCity?: string | null, fallbackState?: string | null) {
    const area = captainServiceAreas.find((item) => item.cityCode === cityCode && item.stateCode === stateCode);
    return area ? {
      stateCode: area.stateCode,
      stateName: area.stateName,
      cityCode: area.cityCode,
      cityName: area.cityName,
      label: `${area.cityName}, ${area.stateCode === "FCT" ? "FCT" : area.stateName}`
    } : {
      stateCode: stateCode ?? null,
      stateName: fallbackState ?? null,
      cityCode: cityCode ?? null,
      cityName: fallbackCity ?? null,
      label: [fallbackCity, fallbackState].filter(Boolean).join(", ") || null
    };
  }

  private toAdminCaptainDocument(document: Prisma.CaptainApplicationDocumentGetPayload<Record<string, never>>) {
    const required = this.requiredRideDocumentTypes().includes(document.documentType);
    return {
      id: document.id,
      documentType: document.documentType,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadStatus: document.uploadStatus,
      reviewStatus: document.reviewStatus,
      uploadedAt: document.uploadedAt.toISOString(),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      required,
      optional: !required,
      adminNote: document.adminNote
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
      captainDocuments: (application.captainDocuments ?? []).map((document) => this.toAdminCaptainDocument(document)),
      residentialLocation: this.locationSummary(application.residentialCityCode, application.residentialStateCode, application.city, application.state),
      operatingAreas: this.operatingAreaSummaries(application.operatingAreaIds),
      primaryOperatingArea: this.operatingAreaSummary(application.primaryOperatingAreaId),
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
      captainDocuments: (application.captainDocuments ?? []).map((document) => this.toAdminCaptainDocument(document)),
      residentialLocation: this.locationSummary(application.residentialCityCode, application.residentialStateCode, application.city, application.state),
      operatingAreas: this.operatingAreaSummaries(application.operatingAreaIds),
      primaryOperatingArea: this.operatingAreaSummary(application.primaryOperatingAreaId),
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
