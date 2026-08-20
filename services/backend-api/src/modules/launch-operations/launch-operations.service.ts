import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  LaunchCohortMemberStatus,
  LaunchCohortStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchDrillType,
  LaunchIncidentSeverity,
  LaunchIncidentStatus,
  LaunchReadinessStatus,
  LaunchServiceType,
  LaunchStage,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RiderStatus,
  ServiceProviderRequestStatus,
  ServiceProviderStatus,
  SettlementStatus,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  TaxiDriverProfileStatus,
  TaxiTripStatus,
  UserRole,
  VendorStatus
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AddLaunchCohortMembersDto,
  CreateLaunchCohortDto,
  CreateLaunchDrillDto,
  CreateLaunchIncidentDto,
  PauseFromIncidentDto,
  UpdateLaunchCohortDto,
  UpdateLaunchCohortMemberDto,
  UpdateLaunchConfigDto,
  UpdateLaunchDrillDto,
  UpdateLaunchIncidentDto,
  UpdateLaunchReadinessDto
} from "./dto/launch-operations.dto";
import { LinkLaunchDrillFailureDto, ReopenLaunchDrillDto, UpdateLaunchDrillStepDto } from "./dto/launch-operations.dto";
import { ControlledSupplyService } from "./controlled-supply.service";
import {
  captainIsApprovedForOperatingArea,
  captainOperatingAreaFromCoordinates,
  captainOperatingAreaFromText
} from "../platform/captain-operating-areas";

export const LAUNCH_CITIES = [
  { code: "KANO", name: "Kano" },
  { code: "ABUJA", name: "Abuja" }
] as const;
export const LAUNCH_SERVICES = Object.values(LaunchServiceType);
const ACTIVE_COHORT_MEMBER_STATUSES = [LaunchCohortMemberStatus.INVITED, LaunchCohortMemberStatus.ACTIVE];
const ACTIVE_TRIP_STATUSES = [
  TaxiTripStatus.REQUESTED,
  TaxiTripStatus.DRIVER_ASSIGNED,
  TaxiTripStatus.ACCEPTED,
  TaxiTripStatus.ARRIVED_PICKUP,
  TaxiTripStatus.STARTED,
  TaxiTripStatus.ARRIVED_DESTINATION
];
const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.VENDOR_CONFIRMING,
  OrderStatus.VENDOR_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.RIDER_ARRIVING_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
  OrderStatus.ARRIVED_DESTINATION,
  OrderStatus.DELIVERED
];
const READINESS_CATEGORIES = [
  "Backend and infrastructure",
  "Admin Operations coverage",
  "Captain supply",
  "Partner supply",
  "Customer support",
  "Payments and settlements",
  "Safety and incident response",
  "End-to-end transaction testing",
  "Legal and privacy readiness",
  "Communications readiness"
] as const;
const DEFAULT_CUSTOMER_MESSAGES: Record<LaunchStage, string> = {
  OFF: "This KariGO service is not available in your city yet.",
  OPERATIONS_ONLY: "This KariGO service is currently available for Operations checks only.",
  INVITE_ONLY: "This KariGO service is currently available to invited customers.",
  LIMITED_PUBLIC: "This KariGO service has limited availability in your area.",
  CITY_WIDE: "This KariGO service is available in your city.",
  PAUSED: "This KariGO service is temporarily paused. Existing activity remains available."
};

const DRILL_CHECKLISTS: Partial<Record<LaunchDrillType, string[]>> = {
  RIDE_END_TO_END: [
    "Captain online", "Customer Ride requested", "Captain assigned", "Captain accepted", "Arrived pickup",
    "Ride PIN available", "Ride started", "Destination reached", "Ride completed", "Customer record verified",
    "Captain earnings verified", "Assignment lock released"
  ],
  PRODUCT_ORDER_END_TO_END: [
    "Order created", "Partner accepted", "Delivery Captain assigned", "Pickup completed", "Delivery completed",
    "Customer handoff completed", "Partner earning recorded", "Captain earning recorded", "Reconciliation verified"
  ],
  DELIVERY_END_TO_END: [
    "Order created", "Partner accepted", "Delivery Captain assigned", "Pickup completed", "Delivery completed",
    "Customer handoff completed", "Partner earning recorded", "Captain earning recorded", "Reconciliation verified"
  ],
  SERVICE_REQUEST_END_TO_END: [
    "Request created", "Provider acknowledged", "Lifecycle progressed", "Completed", "Relevant earning or settlement verified"
  ]
};

const GENERIC_DRILL_CHECKLIST = ["Confirm controlled participants", "Start drill", "Record expected result", "Review audit evidence", "Record drill outcome"];

type EligibilityInput = {
  city: string;
  serviceType: LaunchServiceType;
  userId?: string;
  zoneId?: string;
  enforceCapacity?: boolean;
  participantRole?: UserRole;
  actorContext?: "CAPTAIN";
};

@Injectable()
export class LaunchOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AdminAuditService,
    private readonly controlledSupply: ControlledSupplyService
  ) {}

  normalizeCity(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized.includes("kano")) return LAUNCH_CITIES[0];
    if (normalized === "fct" || normalized.includes("abuja") || normalized.includes("federal capital territory")) return LAUNCH_CITIES[1];
    throw new BadRequestException("KariGO production launch controls currently support Kano and Abuja only");
  }

  private launchKilled() {
    const value = this.config.get<string | boolean>("LAUNCH_GLOBAL_KILL_SWITCH", false);
    return value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");
  }

  private configSnapshot(config: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue;
  }

  private async ensureDefaultConfigs() {
    await this.prisma.$transaction(
      LAUNCH_CITIES.flatMap((city) => LAUNCH_SERVICES.map((serviceType) => this.prisma.launchMarketConfig.upsert({
        where: { cityCode_serviceType: { cityCode: city.code, serviceType } },
        create: { cityCode: city.code, cityName: city.name, serviceType, launchStage: LaunchStage.OFF, isEnabled: false },
        update: {}
      })))
    );
  }

  private async ensureReadiness(cityCode: string) {
    await this.prisma.$transaction(READINESS_CATEGORIES.map((category, index) => {
      const key = category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      return this.prisma.launchReadinessItem.upsert({
        where: { cityCode_key: { cityCode, key } },
        create: { cityCode, category, key, label: category, status: LaunchReadinessStatus.NOT_READY },
        update: { label: category, category }
      });
    }));
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private operatingWindow(config: { operatingHours: Prisma.JsonValue | null; timezone: string; emergencyClosed: boolean }, now = new Date()) {
    if (config.emergencyClosed) return { open: false, reason: "EMERGENCY_CLOSURE", nextOpeningAt: null };
    if (!config.operatingHours || typeof config.operatingHours !== "object" || Array.isArray(config.operatingHours)) {
      return { open: true, reason: null, nextOpeningAt: null };
    }
    const hours = config.operatingHours as Record<string, unknown>;
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const holiday = hours.holidayOverrides && typeof hours.holidayOverrides === "object"
      ? (hours.holidayOverrides as Record<string, unknown>)[dateKey]
      : undefined;
    if (holiday && typeof holiday === "object" && !Array.isArray(holiday) && (holiday as Record<string, unknown>).closed === true) {
      return { open: false, reason: "HOLIDAY_CLOSED", nextOpeningAt: null };
    }
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: config.timezone, weekday: "short" }).format(now).toLowerCase();
    const weekly = hours.weekly && typeof hours.weekly === "object" ? hours.weekly as Record<string, unknown> : {};
    const window = holiday ?? weekly[weekday];
    if (window === undefined) return { open: true, reason: null, nextOpeningAt: null };
    if (!window || typeof window !== "object" || Array.isArray(window)) return { open: false, reason: "OUTSIDE_OPERATING_HOURS", nextOpeningAt: null };
    const record = window as Record<string, unknown>;
    if (record.closed === true) return { open: false, reason: "OUTSIDE_OPERATING_HOURS", nextOpeningAt: null };
    const open = typeof record.open === "string" ? record.open : "00:00";
    const close = typeof record.close === "string" ? record.close : "23:59";
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: config.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    return { open: time >= open && time <= close, reason: time >= open && time <= close ? null : "OUTSIDE_OPERATING_HOURS", nextOpeningAt: null };
  }

  private async cohortEligible(config: { inviteCohortId: string | null }, userId?: string) {
    if (!config.inviteCohortId || !userId) return false;
    const now = new Date();
    return Boolean(await this.prisma.launchCohortMember.findFirst({
      where: {
        cohortId: config.inviteCohortId,
        userId,
        status: { in: ACTIVE_COHORT_MEMBER_STATUSES },
        cohort: {
          status: LaunchCohortStatus.ACTIVE,
          OR: [{ startAt: null }, { startAt: { lte: now } }],
          AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }]
        }
      },
      select: { id: true }
    }));
  }

  private async capacity(config: {
    id: string;
    cityCode: string;
    cityName: string;
    serviceType: LaunchServiceType;
    maxConcurrentRequests: number | null;
    maxUnassignedRequests: number | null;
    minimumOnlineCaptainCount: number | null;
    minimumOnlinePartnerCount: number | null;
    captainLocationFreshMinutes: number | null;
  }) {
    const cityFilter = { contains: config.cityName, mode: "insensitive" as const };
    const locationCutoff = new Date(Date.now() - (config.captainLocationFreshMinutes ?? 15) * 60_000);
    if (config.serviceType === LaunchServiceType.RIDES) {
      const [onlineProfiles, activeRequests, unassignedRequests] = await Promise.all([
        this.prisma.taxiDriverProfile.findMany({
          where: { status: TaxiDriverProfileStatus.ACTIVE, isAvailableForTaxi: true, lastSeenAt: { gte: locationCutoff } },
          select: {
            city: true,
            state: true,
            lastKnownLatitude: true,
            lastKnownLongitude: true,
            application: { select: { operatingAreaIds: true, primaryOperatingAreaId: true, city: true, state: true } }
          }
        }),
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: { in: ACTIVE_TRIP_STATUSES } } }),
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: TaxiTripStatus.REQUESTED, driverProfileId: null } })
      ]);
      const targetArea = captainOperatingAreaFromText(config.cityName, config.cityCode);
      const onlineSupply = targetArea ? onlineProfiles.filter((profile) => {
        const currentArea = captainOperatingAreaFromCoordinates(Number(profile.lastKnownLatitude), Number(profile.lastKnownLongitude));
        return currentArea?.id === targetArea.id && captainIsApprovedForOperatingArea(
          profile.application,
          targetArea.id,
          { city: profile.city, state: profile.state }
        );
      }).length : 0;
      return this.capacityResult(config, onlineSupply, activeRequests, unassignedRequests, null);
    }
    if (config.serviceType === LaunchServiceType.SME_SERVICES) {
      const [onlineSupply, activeRequests] = await Promise.all([
        this.prisma.serviceProvider.count({ where: { city: cityFilter, status: ServiceProviderStatus.APPROVED, readinessOnly: false } }),
        this.prisma.serviceProviderRequest.count({ where: { serviceAddress: { city: cityFilter }, status: { in: [ServiceProviderRequestStatus.SUBMITTED, ServiceProviderRequestStatus.UNDER_REVIEW, ServiceProviderRequestStatus.PROVIDER_MATCHING, ServiceProviderRequestStatus.PROVIDER_ASSIGNED] } } })
      ]);
      return this.capacityResult(config, null, activeRequests, null, onlineSupply);
    }
    const category = config.serviceType === LaunchServiceType.FOOD ? "FOOD"
      : config.serviceType === LaunchServiceType.GROCERIES ? "GROCERY"
        : config.serviceType === LaunchServiceType.MARKETPLACE ? "MARKET"
          : null;
    const [onlinePartners, onlineCaptains, activeRequests, unassignedRequests] = await Promise.all([
      category ? this.prisma.vendor.count({ where: { city: cityFilter, status: VendorStatus.ACTIVE, isOpen: true, products: { some: { isActive: true, isAvailable: true, deletedAt: null } } } }) : Promise.resolve(0),
      this.prisma.rider.count({ where: { verificationStatus: RiderStatus.ACTIVE, availabilityStatus: RiderStatus.ONLINE, deletedAt: null } }),
      this.prisma.order.count({ where: { serviceCategory: category as never ?? undefined, vendor: category ? { city: cityFilter } : undefined, orderStatus: { in: ACTIVE_ORDER_STATUSES } } }),
      this.prisma.order.count({ where: { serviceCategory: category as never ?? undefined, vendor: category ? { city: cityFilter } : undefined, riderId: null, orderStatus: { in: ACTIVE_ORDER_STATUSES } } })
    ]);
    return this.capacityResult(config, onlineCaptains, activeRequests, unassignedRequests, category ? onlinePartners : null);
  }

  private capacityResult(config: { maxConcurrentRequests: number | null; maxUnassignedRequests: number | null; minimumOnlineCaptainCount: number | null; minimumOnlinePartnerCount: number | null }, onlineCaptains: number | null, activeRequests: number, unassignedRequests: number | null, onlinePartners: number | null) {
    let reasonCode: string | null = null;
    if (config.minimumOnlineCaptainCount !== null && (onlineCaptains ?? 0) < config.minimumOnlineCaptainCount) reasonCode = "CAPTAIN_SUPPLY_BELOW_MINIMUM";
    if (!reasonCode && config.minimumOnlinePartnerCount !== null && (onlinePartners ?? 0) < config.minimumOnlinePartnerCount) reasonCode = "PARTNER_SUPPLY_BELOW_MINIMUM";
    if (!reasonCode && config.maxConcurrentRequests !== null && activeRequests >= config.maxConcurrentRequests) reasonCode = "MAX_CONCURRENT_REQUESTS_REACHED";
    if (!reasonCode && config.maxUnassignedRequests !== null && (unassignedRequests ?? 0) >= config.maxUnassignedRequests) reasonCode = "MAX_UNASSIGNED_REQUESTS_REACHED";
    return { available: reasonCode === null, reasonCode, onlineCaptains, onlinePartners, activeRequests, unassignedRequests };
  }

  async resolveEligibility(input: EligibilityInput) {
    const city = this.normalizeCity(input.city);
    const config = await this.prisma.launchMarketConfig.findUnique({ where: { cityCode_serviceType: { cityCode: city.code, serviceType: input.serviceType } } });
    if (!config || this.launchKilled()) return this.safeEligibility(city, input.serviceType, LaunchStage.OFF, false, "SERVICE_OFF", null);
    const now = new Date();
    if (config.launchStage === LaunchStage.PAUSED) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "SERVICE_PAUSED", config);
    if (!config.isEnabled || config.launchStage === LaunchStage.OFF || config.emergencyClosed) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "SERVICE_OFF", config);
    if ((config.activeFrom && config.activeFrom > now) || (config.activeUntil && config.activeUntil < now)) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "OUTSIDE_ACTIVE_DATES", config);
    const hours = this.operatingWindow(config);
    if (!hours.open) return this.safeEligibility(city, input.serviceType, config.launchStage, false, hours.reason ?? "OUTSIDE_OPERATING_HOURS", config);
    const zones = this.readStringArray(config.allowedZoneIds);
    if (zones.length && (!input.zoneId || !zones.includes(input.zoneId))) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "ZONE_NOT_AVAILABLE", config);
    const user = input.userId ? await this.prisma.user.findUnique({ where: { id: input.userId }, select: { role: true, accountStatus: true, deletedAt: true } }) : null;
    if (input.userId && (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE)) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "ACCOUNT_NOT_ELIGIBLE", config);
    if (input.actorContext === "CAPTAIN") {
      return this.resolveCaptainCapabilityEligibility({ city, config, serviceType: input.serviceType, userId: input.userId! });
    }
    const cohortEligible = await this.cohortEligible(config, input.userId);
    if (config.launchStage === LaunchStage.OPERATIONS_ONLY) {
      const participantRole = input.participantRole ?? user?.role;
      const controlledEligible = Boolean(input.userId && participantRole && await this.controlledSupply.accountEligible(city.name, input.serviceType, input.userId, participantRole));
      if (!controlledEligible) return this.safeEligibility(city, input.serviceType, config.launchStage, false, participantRole === UserRole.CUSTOMER ? "OPERATIONS_ONLY" : "NOT_IN_CONTROLLED_GROUP", config);
    }
    if (config.launchStage === LaunchStage.INVITE_ONLY && !cohortEligible) return this.safeEligibility(city, input.serviceType, config.launchStage, false, "INVITE_REQUIRED", config);
    if (input.enforceCapacity !== false) {
      const capacity = await this.capacity(config);
      if (!capacity.available) {
        await this.prisma.launchCapacityDenial.create({ data: { cityCode: city.code, serviceType: input.serviceType, marketConfigId: config.id, reasonCode: capacity.reasonCode! } });
        return this.safeEligibility(city, input.serviceType, config.launchStage, false, "AT_CAPACITY", config);
      }
    }
    return this.safeEligibility(city, input.serviceType, config.launchStage, true, null, config);
  }

  private async resolveCaptainCapabilityEligibility(input: {
    city: typeof LAUNCH_CITIES[number];
    config: {
      launchStage: LaunchStage;
      customerMessage: string | null;
      closedMessage: string | null;
      timezone: string;
      operatingHours: Prisma.JsonValue | null;
    };
    serviceType: LaunchServiceType;
    userId: string;
  }) {
    if (!([LaunchServiceType.RIDES, LaunchServiceType.PARCEL_DELIVERY] as LaunchServiceType[]).includes(input.serviceType)) {
      return this.safeEligibility(input.city, input.serviceType, input.config.launchStage, false, "CAPABILITY_NOT_AVAILABLE", input.config, "Captain capability is not available for this service.");
    }
    const candidate = (await this.controlledSupply.captainEligibility(input.city.name, input.serviceType))
      .find((item) => item.userId === input.userId);
    if (!candidate) {
      return this.safeEligibility(input.city, input.serviceType, input.config.launchStage, false, "CAPABILITY_NOT_AVAILABLE", input.config, "Approved Captain access is not available for this service.");
    }
    const membershipBlockers = new Set(["NOT_IN_CONTROLLED_GROUP", "MEMBERSHIP_ACTIVATION_PENDING"]);
    const blockers = candidate.blockers.filter((blocker) => input.config.launchStage === LaunchStage.OPERATIONS_ONLY || !membershipBlockers.has(blocker));
    const targetArea = captainOperatingAreaFromText(input.city.name, input.city.code);
    if (!targetArea || candidate.currentGpsArea?.id !== targetArea.id) blockers.unshift("CURRENT_AREA_MISMATCH");
    const blocker = blockers[0];
    if (!blocker) return this.safeEligibility(input.city, input.serviceType, input.config.launchStage, true, null, input.config);
    const reason = this.captainDenial(blocker);
    return this.safeEligibility(input.city, input.serviceType, input.config.launchStage, false, reason.reasonCode, input.config, reason.message);
  }

  private captainDenial(blocker: string) {
    if (blocker === "NOT_IN_CONTROLLED_GROUP" || blocker === "MEMBERSHIP_ACTIVATION_PENDING") {
      return { reasonCode: "CONTROLLED_ACCESS_NOT_ENABLED", message: "Controlled Captain access is not enabled for this city and service." };
    }
    if (blocker === "LOCATION_STALE") return { reasonCode: "LOCATION_NOT_CURRENT", message: "Captain location is no longer current. Refresh precise location and try again." };
    if (blocker === "CURRENT_AREA_MISMATCH" || blocker === "CITY_MISMATCH") {
      return { reasonCode: "OPERATING_AREA_NOT_APPROVED", message: "Your current area is not approved for this Captain service." };
    }
    if (blocker === "ACTIVE_ASSIGNMENT") return { reasonCode: "ACTIVE_WORK_CONFLICT", message: "Finish the active assignment before changing Captain availability." };
    if (blocker === "SUSPENDED") return { reasonCode: "ACCOUNT_SUSPENDED", message: "Captain access is suspended." };
    return { reasonCode: "CAPTAIN_NOT_READY", message: "Captain access is not ready for this service." };
  }

  async controlledSupplyAccountEligible(input: { city: string; serviceType: LaunchServiceType; userId?: string | null; participant?: "Captain" | "Partner" }) {
    const city = this.normalizeCity(input.city);
    const config = await this.prisma.launchMarketConfig.findUnique({ where: { cityCode_serviceType: { cityCode: city.code, serviceType: input.serviceType } } });
    if (!config || config.launchStage !== LaunchStage.OPERATIONS_ONLY || !config.isEnabled) return true;
    if (!input.userId) return false;
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { role: true, accountStatus: true, deletedAt: true } });
    if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE) return false;
    const capabilityRole = input.participant === "Captain" ? UserRole.RIDER
      : input.participant === "Partner" ? UserRole.VENDOR : user.role;
    return this.controlledSupply.accountEligible(city.name, input.serviceType, input.userId, capabilityRole);
  }

  async assertControlledSupplyCanReceive(input: { city: string; serviceType: LaunchServiceType; userId: string; participant: "Captain" | "Partner" }) {
    if (!await this.controlledSupplyAccountEligible(input)) {
      throw new ServiceUnavailableException(`${input.participant} is not enabled in active controlled supply for this city and service.`);
    }
  }

  async assertCaptainCanReceive(input: { city: string; serviceType: LaunchServiceType; userId: string }) {
    const city = this.normalizeCity(input.city);
    const config = await this.prisma.launchMarketConfig.findUnique({
      where: { cityCode_serviceType: { cityCode: city.code, serviceType: input.serviceType } }
    });
    const now = new Date();
    const unavailableReason = !config || this.launchKilled()
      ? "SERVICE_OFF"
      : config.launchStage === LaunchStage.PAUSED
        ? "SERVICE_PAUSED"
        : !config.isEnabled || config.launchStage === LaunchStage.OFF || config.emergencyClosed
          ? "SERVICE_OFF"
          : (config.activeFrom && config.activeFrom > now) || (config.activeUntil && config.activeUntil < now)
          ? "OUTSIDE_ACTIVE_DATES"
          : !this.operatingWindow(config).open
            ? "OUTSIDE_OPERATING_HOURS"
            : null;
    if (unavailableReason) {
      const safe = this.safeEligibility(city, input.serviceType, config?.launchStage ?? LaunchStage.OFF, false, unavailableReason, config ?? null);
      throw new ServiceUnavailableException({ message: safe.message, reasonCode: unavailableReason, launchStage: safe.launchStage });
    }
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { accountStatus: true, deletedAt: true } });
    if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ServiceUnavailableException({ message: "Captain account is not eligible for this service.", reasonCode: "ACCOUNT_NOT_ELIGIBLE", launchStage: config!.launchStage });
    }
    await this.assertControlledSupplyCanReceive({ ...input, participant: "Captain" });
    return { cityCode: city.code, cityName: city.name, serviceType: input.serviceType, launchStage: config!.launchStage };
  }

  private safeEligibility(city: typeof LAUNCH_CITIES[number], serviceType: LaunchServiceType, stage: LaunchStage, available: boolean, reasonCode: string | null, config: { customerMessage: string | null; closedMessage: string | null; timezone: string; operatingHours: Prisma.JsonValue | null } | null, unavailableMessage?: string) {
    const message = available ? (config?.customerMessage || DEFAULT_CUSTOMER_MESSAGES[stage])
      : unavailableMessage ? unavailableMessage
      : reasonCode === "AT_CAPACITY" ? "KariGO is currently at capacity in your area. Please try again shortly."
        : (config?.closedMessage || config?.customerMessage || DEFAULT_CUSTOMER_MESSAGES[stage]);
    return { cityCode: city.code, cityName: city.name, serviceType, launchStage: stage, available, reasonCode, message, timezone: config?.timezone ?? "Africa/Lagos", operatingHours: config?.operatingHours ?? null };
  }

  async assertCustomerCanStart(input: EligibilityInput) {
    const result = await this.resolveEligibility({ ...input, participantRole: UserRole.CUSTOMER, enforceCapacity: true });
    if (!result.available) throw new ServiceUnavailableException({ message: result.message, reasonCode: result.reasonCode, launchStage: result.launchStage });
    return result;
  }

  async publicAvailability(cityInput: string, zoneId?: string, userId?: string) {
    const city = this.normalizeCity(cityInput);
    const services = await Promise.all(LAUNCH_SERVICES.map((serviceType) => this.resolveEligibility({ city: city.name, serviceType, zoneId, userId, enforceCapacity: true })));
    return { city: { code: city.code, name: city.name }, services, refreshedAt: new Date().toISOString() };
  }

  async captainAvailability(cityInput: string, zoneId: string | undefined, userId: string) {
    const city = this.normalizeCity(cityInput);
    const services = await Promise.all(LAUNCH_SERVICES.map((serviceType) => this.resolveEligibility({
      city: city.name, serviceType, zoneId, userId,
      enforceCapacity: false,
      actorContext: "CAPTAIN"
    })));
    return { city: { code: city.code, name: city.name }, services, refreshedAt: new Date().toISOString() };
  }

  async configs() {
    await this.ensureDefaultConfigs();
    return this.prisma.launchMarketConfig.findMany({ include: { inviteCohort: { select: { id: true, name: true, status: true } } }, orderBy: [{ cityCode: "asc" }, { serviceType: "asc" }] });
  }

  async updateConfig(cityInput: string, serviceType: LaunchServiceType, adminUserId: string, dto: UpdateLaunchConfigDto) {
    const city = this.normalizeCity(cityInput);
    if (!dto.confirmed) throw new BadRequestException("Launch configuration changes require confirmation");
    if ((dto.launchStage === LaunchStage.CITY_WIDE || dto.launchStage === LaunchStage.PAUSED) && !dto.highImpactConfirmed) throw new BadRequestException("City-wide activation and service pause require second confirmation");
    if (dto.launchStage === LaunchStage.PAUSED && !dto.pausedReason?.trim()) throw new BadRequestException("A pause reason is required");
    if (dto.activeFrom && dto.activeUntil && new Date(dto.activeFrom) >= new Date(dto.activeUntil)) throw new BadRequestException("activeUntil must be after activeFrom");
    const existing = await this.prisma.launchMarketConfig.findUnique({ where: { cityCode_serviceType: { cityCode: city.code, serviceType } } });
    if (dto.launchStage === LaunchStage.OPERATIONS_ONLY && existing?.launchStage !== LaunchStage.OPERATIONS_ONLY) await this.controlledSupply.assertOperationsReady(city.name, serviceType);
    const previous = existing ?? { launchStage: LaunchStage.OFF, isEnabled: false, cityCode: city.code, cityName: city.name, serviceType };
    const data = {
      cityName: city.name,
      launchStage: dto.launchStage,
      isEnabled: dto.isEnabled,
      activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
      activeUntil: dto.activeUntil ? new Date(dto.activeUntil) : null,
      operatingHours: dto.operatingHours as Prisma.InputJsonValue | undefined,
      allowedZoneIds: dto.allowedZoneIds as Prisma.InputJsonValue | undefined,
      inviteCohortId: dto.inviteCohortId ?? null,
      maxConcurrentRequests: dto.maxConcurrentRequests ?? null,
      maxUnassignedRequests: dto.maxUnassignedRequests ?? null,
      minimumOnlineCaptainCount: dto.minimumOnlineCaptainCount ?? null,
      minimumOnlinePartnerCount: dto.minimumOnlinePartnerCount ?? null,
      assignmentTimeoutMinutes: dto.assignmentTimeoutMinutes ?? null,
      captainLocationFreshMinutes: dto.captainLocationFreshMinutes ?? null,
      customerMessage: dto.customerMessage?.trim() || null,
      closedMessage: dto.closedMessage?.trim() || null,
      internalNote: dto.internalNote?.trim() || null,
      pausedReason: dto.launchStage === LaunchStage.PAUSED ? dto.pausedReason?.trim() : null,
      updatedByAdminId: adminUserId
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.launchMarketConfig.upsert({
        where: { cityCode_serviceType: { cityCode: city.code, serviceType } },
        create: { cityCode: city.code, serviceType, ...data },
        update: data
      });
      await tx.launchMarketConfigHistory.create({ data: { configId: result.id, previousStage: previous.launchStage, newStage: result.launchStage, previousValue: this.configSnapshot(previous as Record<string, unknown>), newValue: this.configSnapshot(result as unknown as Record<string, unknown>), reason: dto.reason.trim(), adminUserId } });
      return result;
    });
    await this.audit.record(adminUserId, "admin.production_launch.config_changed", "LaunchMarketConfig", updated.id, { cityCode: city.code, serviceType, previousStage: previous.launchStage, newStage: updated.launchStage, reason: dto.reason });
    return updated;
  }

  async history() {
    return this.prisma.launchMarketConfigHistory.findMany({ include: { config: { select: { cityCode: true, cityName: true, serviceType: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  }

  async createCohort(adminUserId: string, dto: CreateLaunchCohortDto) {
    const city = this.normalizeCity(dto.city);
    const cohort = await this.prisma.launchCohort.create({ data: { name: dto.name.trim(), cityCode: city.code, maximumCustomers: dto.maximumCustomers, startAt: dto.startAt ? new Date(dto.startAt) : null, endAt: dto.endAt ? new Date(dto.endAt) : null, status: dto.status ?? LaunchCohortStatus.DRAFT, notes: dto.notes?.trim(), createdByAdminId: adminUserId }, include: { members: true } });
    await this.audit.record(adminUserId, "admin.production_launch.cohort_created", "LaunchCohort", cohort.id, { cityCode: city.code, maximumCustomers: dto.maximumCustomers });
    return cohort;
  }

  async cohorts() {
    return this.prisma.launchCohort.findMany({ include: { members: { orderBy: { invitedAt: "desc" } }, _count: { select: { members: true } } }, orderBy: { createdAt: "desc" } });
  }

  async updateCohort(id: string, adminUserId: string, dto: UpdateLaunchCohortDto) {
    const cohort = await this.prisma.launchCohort.findUnique({ where: { id } });
    if (!cohort) throw new NotFoundException("Launch cohort not found");
    const updated = await this.prisma.launchCohort.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record(adminUserId, "admin.production_launch.cohort_status_changed", "LaunchCohort", id, { previousStatus: cohort.status, newStatus: dto.status, reason: dto.reason });
    return updated;
  }

  async addCohortMembers(cohortId: string, adminUserId: string, dto: AddLaunchCohortMembersDto) {
    const cohort = await this.prisma.launchCohort.findUnique({ where: { id: cohortId }, include: { _count: { select: { members: { where: { status: { not: LaunchCohortMemberStatus.REMOVED } } } } } } });
    if (!cohort) throw new NotFoundException("Launch cohort not found");
    const uniqueIds = [...new Set(dto.userIds)];
    if (cohort._count.members + uniqueIds.length > cohort.maximumCustomers) throw new BadRequestException("Adding these customers would exceed the cohort limit");
    const customers = await this.prisma.user.findMany({ where: { id: { in: uniqueIds }, role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null }, select: { id: true } });
    if (customers.length !== uniqueIds.length) throw new BadRequestException("Every cohort member must be an active Customer account");
    await this.prisma.$transaction(uniqueIds.map((userId) => this.prisma.launchCohortMember.upsert({ where: { cohortId_userId: { cohortId, userId } }, create: { cohortId, userId, addedByAdminId: adminUserId }, update: { status: LaunchCohortMemberStatus.INVITED, removedAt: null, reason: null, addedByAdminId: adminUserId, invitedAt: new Date() } })));
    await this.audit.record(adminUserId, "admin.production_launch.cohort_members_added", "LaunchCohort", cohortId, { memberCount: uniqueIds.length });
    return this.prisma.launchCohort.findUnique({ where: { id: cohortId }, include: { members: true } });
  }

  async updateCohortMember(cohortId: string, memberId: string, adminUserId: string, dto: UpdateLaunchCohortMemberDto) {
    const member = await this.prisma.launchCohortMember.findFirst({ where: { id: memberId, cohortId } });
    if (!member) throw new NotFoundException("Launch cohort member not found");
    const updated = await this.prisma.launchCohortMember.update({ where: { id: memberId }, data: { status: dto.status, reason: dto.reason?.trim(), activatedAt: dto.status === LaunchCohortMemberStatus.ACTIVE ? new Date() : member.activatedAt, removedAt: dto.status === LaunchCohortMemberStatus.REMOVED ? new Date() : null } });
    await this.audit.record(adminUserId, "admin.production_launch.cohort_member_changed", "LaunchCohortMember", memberId, { cohortId, previousStatus: member.status, newStatus: dto.status, reason: dto.reason });
    return updated;
  }

  async readiness(cityInput: string) {
    const city = this.normalizeCity(cityInput);
    await this.ensureReadiness(city.code);
    const items = await this.prisma.launchReadinessItem.findMany({ where: { cityCode: city.code }, orderBy: { category: "asc" } });
    const ready = items.filter((item) => item.status === LaunchReadinessStatus.READY || (item.status === LaunchReadinessStatus.WAIVED && item.waiverExpiresAt && item.waiverExpiresAt > new Date())).length;
    return { city, items, score: { ready, total: items.length, percentage: items.length ? Math.round((ready / items.length) * 100) : 0 }, finalDecisionRequired: true };
  }

  async updateReadiness(cityInput: string, itemId: string, adminUserId: string, dto: UpdateLaunchReadinessDto) {
    const city = this.normalizeCity(cityInput);
    const item = await this.prisma.launchReadinessItem.findFirst({ where: { id: itemId, cityCode: city.code } });
    if (!item) throw new NotFoundException("Launch readiness item not found");
    if (dto.status === LaunchReadinessStatus.WAIVED && (!dto.waiverReason?.trim() || !dto.waiverExpiresAt || new Date(dto.waiverExpiresAt) <= new Date())) throw new BadRequestException("A waiver requires a reason and future expiry date");
    const updated = await this.prisma.launchReadinessItem.update({ where: { id: item.id }, data: { status: dto.status, note: dto.note?.trim(), waiverReason: dto.status === LaunchReadinessStatus.WAIVED ? dto.waiverReason?.trim() : null, waiverExpiresAt: dto.status === LaunchReadinessStatus.WAIVED ? new Date(dto.waiverExpiresAt!) : null, updatedByAdminId: adminUserId } });
    await this.audit.record(adminUserId, "admin.production_launch.readiness_changed", "LaunchReadinessItem", item.id, { cityCode: city.code, previousStatus: item.status, newStatus: dto.status, waiverReason: updated.waiverReason, waiverExpiresAt: updated.waiverExpiresAt });
    return updated;
  }

  private cityOrderWhere(cityName: string) {
    return { OR: [{ vendor: { city: { contains: cityName, mode: "insensitive" as const } } }, { deliveryAddress: { city: { contains: cityName, mode: "insensitive" as const } } }] };
  }

  async supply(cityInput?: string) {
    const cities = cityInput ? [this.normalizeCity(cityInput)] : [...LAUNCH_CITIES];
    return Promise.all(cities.map(async (city) => {
      const cityFilter = { contains: city.name, mode: "insensitive" as const };
      const stale = new Date(Date.now() - 15 * 60_000);
      const [rideApproved, rideOnline, rideBusy, rideStale, deliveryApproved, deliveryOnline, deliveryBusy, partnersActive, partnersOnline, productsActive, servicesActive, applicationsPending] = await Promise.all([
        this.prisma.taxiDriverProfile.count({ where: { city: cityFilter, status: TaxiDriverProfileStatus.ACTIVE } }),
        this.prisma.taxiDriverProfile.count({ where: { city: cityFilter, status: TaxiDriverProfileStatus.ACTIVE, isAvailableForTaxi: true, lastSeenAt: { gte: stale } } }),
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: { in: [TaxiTripStatus.DRIVER_ASSIGNED, TaxiTripStatus.ACCEPTED, TaxiTripStatus.ARRIVED_PICKUP, TaxiTripStatus.STARTED, TaxiTripStatus.ARRIVED_DESTINATION] } } }),
        this.prisma.taxiDriverProfile.count({ where: { city: cityFilter, status: TaxiDriverProfileStatus.ACTIVE, isAvailableForTaxi: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: stale } }] } }),
        this.prisma.rider.count({ where: { verificationStatus: RiderStatus.ACTIVE, deletedAt: null } }),
        this.prisma.rider.count({ where: { verificationStatus: RiderStatus.ACTIVE, availabilityStatus: RiderStatus.ONLINE, deletedAt: null } }),
        this.prisma.rider.count({ where: { verificationStatus: RiderStatus.ACTIVE, availabilityStatus: RiderStatus.BUSY, deletedAt: null } }),
        this.prisma.vendor.count({ where: { city: cityFilter, status: VendorStatus.ACTIVE, deletedAt: null } }),
        this.prisma.vendor.count({ where: { city: cityFilter, status: VendorStatus.ACTIVE, isOpen: true, deletedAt: null } }),
        this.prisma.product.count({ where: { vendor: { city: cityFilter, status: VendorStatus.ACTIVE }, isActive: true, isAvailable: true, deletedAt: null } }),
        this.prisma.vendorService.count({ where: { vendor: { city: cityFilter, status: VendorStatus.ACTIVE }, status: "ACTIVE", deletedAt: null } }),
        this.prisma.vendorApplication.count({ where: { city: cityFilter, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } })
      ]);
      return { city, captains: { ride: { approved: rideApproved, online: rideOnline, busy: rideBusy, locationStale: rideStale }, delivery: { approved: deliveryApproved, online: deliveryOnline, busy: deliveryBusy } }, partners: { active: partnersActive, online: partnersOnline, activeProducts: productsActive, activeServices: servicesActive, applicationsPending } };
    }));
  }

  async incidents() { return this.prisma.launchIncident.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500 }); }

  async createIncident(adminUserId: string, dto: CreateLaunchIncidentDto) {
    const city = this.normalizeCity(dto.city);
    const reference = `KGO-INC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const marketConfig = dto.serviceType ? await this.prisma.launchMarketConfig.findUnique({ where: { cityCode_serviceType: { cityCode: city.code, serviceType: dto.serviceType } }, select: { id: true } }) : null;
    const incident = await this.prisma.launchIncident.create({ data: { reference, severity: dto.severity, cityCode: city.code, serviceType: dto.serviceType, marketConfigId: marketConfig?.id, summary: dto.summary.trim(), customerImpact: dto.customerImpact?.trim(), captainPartnerImpact: dto.captainPartnerImpact?.trim(), openedByAdminId: adminUserId, timeline: [{ at: new Date().toISOString(), actorId: adminUserId, event: "Incident opened" }] } });
    await this.audit.record(adminUserId, "admin.production_launch.incident_created", "LaunchIncident", incident.id, { reference, cityCode: city.code, serviceType: dto.serviceType, severity: dto.severity });
    return incident;
  }

  async updateIncident(id: string, adminUserId: string, dto: UpdateLaunchIncidentDto) {
    const incident = await this.prisma.launchIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException("Launch incident not found");
    const timeline = Array.isArray(incident.timeline) ? [...incident.timeline] : [];
    timeline.push({ at: new Date().toISOString(), actorId: adminUserId, event: dto.timelineNote?.trim() || `Status changed to ${dto.status}` });
    const updated = await this.prisma.launchIncident.update({ where: { id }, data: { status: dto.status, assignedOwnerId: dto.assignedOwnerId, mitigation: dto.mitigation?.trim(), rootCause: dto.rootCause?.trim(), resolution: dto.resolution?.trim(), followUpActions: dto.followUpActions?.trim(), timeline: timeline as Prisma.InputJsonValue, closedAt: dto.status === LaunchIncidentStatus.CLOSED ? new Date() : null } });
    await this.audit.record(adminUserId, "admin.production_launch.incident_changed", "LaunchIncident", id, { previousStatus: incident.status, newStatus: dto.status });
    return updated;
  }

  async pauseFromIncident(id: string, adminUserId: string, dto: PauseFromIncidentDto) {
    const incident = await this.prisma.launchIncident.findUnique({ where: { id } });
    if (!incident?.serviceType) throw new BadRequestException("The incident must identify an affected service before it can pause launch activity");
    return this.updateConfig(incident.cityCode, incident.serviceType, adminUserId, { launchStage: LaunchStage.PAUSED, isEnabled: false, reason: dto.reason, confirmed: dto.confirmed, highImpactConfirmed: dto.highImpactConfirmed, pausedReason: `${incident.reference}: ${dto.reason}` });
  }

  async drills() { return this.prisma.launchDrill.findMany({ include: { steps: { orderBy: { position: "asc" } }, events: { orderBy: { createdAt: "desc" }, take: 100 } }, orderBy: { createdAt: "desc" }, take: 500 }); }

  private drillServiceType(drillType: LaunchDrillType, serviceType?: LaunchServiceType) {
    if (serviceType) return serviceType;
    if (drillType === LaunchDrillType.RIDE_END_TO_END) return LaunchServiceType.RIDES;
    if (drillType === LaunchDrillType.PRODUCT_ORDER_END_TO_END) return LaunchServiceType.MARKETPLACE;
    if (drillType === LaunchDrillType.DELIVERY_END_TO_END) return LaunchServiceType.PARCEL_DELIVERY;
    if (drillType === LaunchDrillType.SERVICE_REQUEST_END_TO_END) return LaunchServiceType.SME_SERVICES;
    return undefined;
  }

  async createDrill(adminUserId: string, dto: CreateLaunchDrillDto) {
    const city = this.normalizeCity(dto.city);
    const serviceType = this.drillServiceType(dto.drillType, dto.serviceType);
    if (dto.controlledCustomerId) {
      const customer = await this.prisma.controlledOperationsCustomer.findFirst({ where: { id: dto.controlledCustomerId, cityCode: city.code, enabled: true } });
      if (!customer) throw new BadRequestException("Select an enabled controlled Customer for this city");
    }
    if (dto.controlledSupplyGroupId) {
      const group = await this.prisma.controlledSupplyGroup.findFirst({ where: { id: dto.controlledSupplyGroupId, cityCode: city.code, ...(serviceType ? { serviceType } : {}) } });
      if (!group) throw new BadRequestException("Controlled supply group does not match the drill city and service");
    }
    const checklist = DRILL_CHECKLISTS[dto.drillType] ?? GENERIC_DRILL_CHECKLIST;
    const drill = await this.prisma.launchDrill.create({ data: {
      cityCode: city.code, drillType: dto.drillType, serviceType, customerUserId: dto.customerUserId,
      captainUserId: dto.captainUserId, partnerUserId: dto.partnerUserId, controlledCustomerId: dto.controlledCustomerId,
      controlledSupplyGroupId: dto.controlledSupplyGroupId, relatedReference: dto.relatedReference?.trim(), notes: dto.notes?.trim(), responsibleAdminId: adminUserId,
      steps: { create: checklist.map((label, position) => ({ key: `step_${position + 1}`, label, position: position + 1 })) },
      events: { create: { eventType: "CREATED", note: "Controlled production drill record created; no transaction started automatically", adminUserId } }
    }, include: { steps: { orderBy: { position: "asc" } }, events: true } });
    await this.audit.record(adminUserId, "admin.production_launch.drill_created", "LaunchDrill", drill.id, { cityCode: city.code, drillType: dto.drillType });
    return drill;
  }

  async updateDrill(id: string, adminUserId: string, dto: UpdateLaunchDrillDto) {
    const drill = await this.prisma.launchDrill.findUnique({ where: { id } });
    if (!drill) throw new NotFoundException("Launch drill not found");
    const completed = dto.result === LaunchDrillResult.PASSED || dto.result === LaunchDrillResult.FAILED || dto.result === LaunchDrillResult.BLOCKED;
    const updated = await this.prisma.launchDrill.update({ where: { id }, data: { result: dto.result, failureStage: dto.failureStage?.trim(), notes: dto.notes?.trim(), evidenceReference: dto.evidenceReference?.trim(), criticalFailure: dto.criticalFailure ?? drill.criticalFailure, startedAt: drill.startedAt ?? (dto.result === LaunchDrillResult.NOT_STARTED ? null : new Date()), completedAt: completed ? new Date() : null, events: { create: { eventType: "RESULT_CHANGED", note: dto.notes?.trim() || `Result changed to ${dto.result}`, adminUserId, metadata: { previousResult: drill.result, newResult: dto.result } } } }, include: { steps: { orderBy: { position: "asc" } }, events: { orderBy: { createdAt: "desc" } } } });
    await this.audit.record(adminUserId, "admin.production_launch.drill_changed", "LaunchDrill", id, { previousResult: drill.result, newResult: dto.result });
    return updated;
  }

  async updateDrillStep(drillId: string, stepId: string, adminUserId: string, dto: UpdateLaunchDrillStepDto) {
    const step = await this.prisma.launchDrillStep.findFirst({ where: { id: stepId, drillId } });
    if (!step) throw new NotFoundException("Launch drill step not found");
    const updated = await this.prisma.launchDrillStep.update({ where: { id: stepId }, data: { status: dto.status, note: dto.note?.trim(), updatedByAdminId: adminUserId, completedAt: dto.status === LaunchDrillStepStatus.PENDING ? null : new Date() } });
    await this.prisma.launchDrillEvent.create({ data: { drillId, eventType: "STEP_CHANGED", note: `${step.label}: ${dto.status}${dto.note ? ` — ${dto.note.trim()}` : ""}`, adminUserId, metadata: { stepId, previousStatus: step.status, newStatus: dto.status } } });
    await this.audit.record(adminUserId, "admin.production_launch.drill_step_changed", "LaunchDrillStep", stepId, { drillId, previousStatus: step.status, newStatus: dto.status });
    return updated;
  }

  async reopenDrill(id: string, adminUserId: string, dto: ReopenLaunchDrillDto) {
    const drill = await this.prisma.launchDrill.findUnique({ where: { id } });
    if (!drill) throw new NotFoundException("Launch drill not found");
    if (drill.result !== LaunchDrillResult.FAILED && drill.result !== LaunchDrillResult.BLOCKED) throw new BadRequestException("Only failed or blocked drills can be reopened");
    const updated = await this.prisma.launchDrill.update({ where: { id }, data: { result: LaunchDrillResult.IN_PROGRESS, completedAt: null, reopenedAt: new Date(), events: { create: { eventType: "REOPENED", note: dto.reason.trim(), adminUserId } } }, include: { steps: { orderBy: { position: "asc" } }, events: { orderBy: { createdAt: "desc" } } } });
    await this.audit.record(adminUserId, "admin.production_launch.drill_reopened", "LaunchDrill", id, { previousResult: drill.result, reason: dto.reason.trim() });
    return updated;
  }

  async linkDrillFailure(id: string, adminUserId: string, dto: LinkLaunchDrillFailureDto) {
    const drill = await this.prisma.launchDrill.findUnique({ where: { id } });
    if (!drill) throw new NotFoundException("Launch drill not found");
    if (drill.result !== LaunchDrillResult.FAILED && drill.result !== LaunchDrillResult.BLOCKED) throw new BadRequestException("Only a failed or blocked drill can create incident/support follow-up");
    let incidentId = drill.incidentId;
    let supportTicketId = drill.supportTicketId;
    if ((dto.action === "INCIDENT" || dto.action === "BOTH") && !incidentId) {
      const incident = await this.createIncident(adminUserId, { city: drill.cityCode, serviceType: drill.serviceType ?? undefined, severity: dto.severity ?? LaunchIncidentSeverity.SEV2, summary: dto.summary });
      incidentId = incident.id;
    }
    if ((dto.action === "SUPPORT" || dto.action === "BOTH") && !supportTicketId) {
      if (!drill.controlledCustomerId) throw new BadRequestException("A controlled Customer is required before creating drill support follow-up");
      const customer = await this.prisma.controlledOperationsCustomer.findUnique({ where: { id: drill.controlledCustomerId } });
      if (!customer) throw new BadRequestException("Controlled Customer record not found");
      const ticket = await this.prisma.supportTicket.create({ data: { ticketNumber: `KGO-SUP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, customerId: customer.customerProfileId, category: SupportTicketCategory.OTHER, priority: dto.criticalFailure ? SupportTicketPriority.CRITICAL : SupportTicketPriority.HIGH, subject: `Controlled drill follow-up: ${drill.drillType}`, description: dto.summary.trim(), assignedAdminId: adminUserId } });
      supportTicketId = ticket.id;
    }
    const updated = await this.prisma.launchDrill.update({ where: { id }, data: { incidentId, supportTicketId, criticalFailure: dto.criticalFailure ?? drill.criticalFailure, events: { create: { eventType: "FAILURE_FOLLOW_UP", note: dto.summary.trim(), adminUserId, metadata: { action: dto.action, incidentId, supportTicketId } } } }, include: { steps: { orderBy: { position: "asc" } }, events: { orderBy: { createdAt: "desc" } } } });
    await this.audit.record(adminUserId, "admin.production_launch.drill_failure_linked", "LaunchDrill", id, { action: dto.action, incidentId, supportTicketId, criticalFailure: updated.criticalFailure });
    return updated;
  }

  async supportQueue() {
    const openStatuses = [SupportTicketStatus.OPEN, SupportTicketStatus.IN_REVIEW, SupportTicketStatus.WAITING_FOR_CUSTOMER, SupportTicketStatus.WAITING_FOR_VENDOR, SupportTicketStatus.WAITING_FOR_RIDER];
    const now = Date.now();
    const tickets = await this.prisma.supportTicket.findMany({ where: { status: { in: openStatuses } }, include: { order: { select: { orderNumber: true, serviceCategory: true, vendor: { select: { city: true } }, deliveryAddress: { select: { city: true } } } }, assignedAdmin: { select: { id: true, fullName: true } } }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], take: 500 });
    return { metrics: { openCases: tickets.length, urgentCases: tickets.filter((item) => item.priority === "CRITICAL").length, olderThanFourHours: tickets.filter((item) => now - item.createdAt.getTime() > 4 * 60 * 60 * 1000).length }, items: tickets.map((item) => ({ ...item, customerId: undefined })) };
  }

  async commandCentre() {
    await this.ensureDefaultConfigs();
    const [configs, supply, incidents, support] = await Promise.all([this.configs(), this.supply(), this.incidents(), this.supportQueue()]);
    const cities = await Promise.all(LAUNCH_CITIES.map(async (city) => {
      const cityFilter = { contains: city.name, mode: "insensitive" as const };
      const [openRides, unassignedRides, activeRides, activeOrders, activeServices, failedRequests, lastRide, lastOrder, readiness] = await Promise.all([
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: TaxiTripStatus.REQUESTED } }),
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: TaxiTripStatus.REQUESTED, driverProfileId: null } }),
        this.prisma.taxiTrip.count({ where: { pickupAddress: cityFilter, status: { in: ACTIVE_TRIP_STATUSES } } }),
        this.prisma.order.count({ where: { ...this.cityOrderWhere(city.name), orderStatus: { in: ACTIVE_ORDER_STATUSES } } }),
        this.prisma.serviceProviderRequest.count({ where: { serviceAddress: { city: cityFilter }, status: { in: [ServiceProviderRequestStatus.SUBMITTED, ServiceProviderRequestStatus.UNDER_REVIEW, ServiceProviderRequestStatus.PROVIDER_MATCHING, ServiceProviderRequestStatus.PROVIDER_ASSIGNED] } } }),
        this.prisma.order.count({ where: { ...this.cityOrderWhere(city.name), orderStatus: { in: [OrderStatus.FAILED, OrderStatus.CANCELLED] } } }),
        this.prisma.taxiTrip.findFirst({ where: { pickupAddress: cityFilter, status: TaxiTripStatus.COMPLETED }, orderBy: { completedAt: "desc" }, select: { tripReference: true, completedAt: true } }),
        this.prisma.order.findFirst({ where: { ...this.cityOrderWhere(city.name), orderStatus: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] } }, orderBy: { updatedAt: "desc" }, select: { orderNumber: true, updatedAt: true } }),
        this.readiness(city.name)
      ]);
      return { city, configs: configs.filter((item) => item.cityCode === city.code), supply: supply.find((item) => item.city.code === city.code), demand: { openRides, unassignedRides, activeRides, activeOrders, activeServices, failedRequests }, readiness: readiness.score, lastSuccessfulOperationalTransaction: lastRide?.completedAt && (!lastOrder || lastRide.completedAt > lastOrder.updatedAt) ? { type: "RIDE", reference: lastRide.tripReference, at: lastRide.completedAt } : lastOrder ? { type: "ORDER", reference: lastOrder.orderNumber, at: lastOrder.updatedAt } : null, openIncidents: incidents.filter((item) => item.cityCode === city.code && item.status !== LaunchIncidentStatus.RESOLVED && item.status !== LaunchIncidentStatus.CLOSED).length };
    }));
    return { cities, supportMetrics: support.metrics, apiHealth: { status: "reachable", checkedAt: new Date().toISOString() }, generatedAt: new Date().toISOString() };
  }

  async dailyReport(dateInput?: string) {
    const date = dateInput ? new Date(`${dateInput}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException("Invalid report date");
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 86_400_000);
    const configs = await this.configs();
    const cities = await Promise.all(LAUNCH_CITIES.map(async (city) => {
      const cityFilter = { contains: city.name, mode: "insensitive" as const };
      const orderWhere = { ...this.cityOrderWhere(city.name), createdAt: { gte: start, lt: end } };
      const rideWhere = { pickupAddress: cityFilter, createdAt: { gte: start, lt: end } };
      const [supply] = await this.supply(city.name);
      const [cohortSize, newCustomers, rideRequests, assignedRides, completedRides, cancelledRides, ordersCreated, ordersCompleted, failedOrders, paymentTotal, refunds, captainEarnings, partnerEarnings, pendingPartnerSettlements, paidPartnerSettlements, supportCases, incidents, denials] = await Promise.all([
        this.prisma.launchCohortMember.count({ where: { cohort: { cityCode: city.code }, status: { in: ACTIVE_COHORT_MEMBER_STATUSES } } }),
        this.prisma.user.count({ where: { role: UserRole.CUSTOMER, createdAt: { gte: start, lt: end }, addresses: { some: { city: cityFilter } } } }),
        this.prisma.taxiTrip.count({ where: rideWhere }),
        this.prisma.taxiTrip.count({ where: { ...rideWhere, driverProfileId: { not: null } } }),
        this.prisma.taxiTrip.count({ where: { ...rideWhere, status: TaxiTripStatus.COMPLETED } }),
        this.prisma.taxiTrip.count({ where: { ...rideWhere, status: { in: [TaxiTripStatus.CANCELLED_BY_ADMIN, TaxiTripStatus.CANCELLED_BY_CUSTOMER, TaxiTripStatus.CANCELLED_BY_DRIVER, TaxiTripStatus.EXPIRED] } } }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.count({ where: { ...orderWhere, orderStatus: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] } } }),
        this.prisma.order.count({ where: { ...orderWhere, orderStatus: OrderStatus.FAILED } }),
        this.prisma.payment.aggregate({ where: { order: this.cityOrderWhere(city.name), paymentStatus: PaymentStatus.SUCCESSFUL, paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        this.prisma.payment.aggregate({ where: { order: this.cityOrderWhere(city.name), paymentStatus: PaymentStatus.REFUNDED, updatedAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        this.prisma.riderEarning.aggregate({ where: { order: this.cityOrderWhere(city.name), createdAt: { gte: start, lt: end } }, _sum: { riderPayout: true } }),
        this.prisma.vendorSettlement.aggregate({ where: { vendor: { city: cityFilter }, createdAt: { gte: start, lt: end } }, _sum: { netAmount: true } }),
        this.prisma.vendorSettlement.count({ where: { vendor: { city: cityFilter }, settlementStatus: { in: [SettlementStatus.PENDING, SettlementStatus.PROCESSING] } } }),
        this.prisma.vendorSettlement.count({ where: { vendor: { city: cityFilter }, settlementStatus: SettlementStatus.PAID, paidAt: { gte: start, lt: end } } }),
        this.prisma.supportTicket.count({ where: { createdAt: { gte: start, lt: end }, order: this.cityOrderWhere(city.name) } }),
        this.prisma.launchIncident.count({ where: { cityCode: city.code, createdAt: { gte: start, lt: end } } }),
        this.prisma.launchCapacityDenial.count({ where: { cityCode: city.code, occurredAt: { gte: start, lt: end } } })
      ]);
      const assignmentRate = rideRequests ? Number(((assignedRides / rideRequests) * 100).toFixed(1)) : 0;
      return { city: city.name, launchStages: configs.filter((item) => item.cityCode === city.code).map((item) => ({ serviceType: item.serviceType, launchStage: item.launchStage })), supply, cohortSize, newCustomers, rideRequests, assignedRides, completedRides, cancelledRides, assignmentRate, ordersCreated, ordersCompleted, failedOrders, paymentTotal: Number(paymentTotal._sum?.amount ?? 0), refundTotal: Number(refunds._sum?.amount ?? 0), captainEarnings: Number(captainEarnings._sum?.riderPayout ?? 0), partnerEarnings: Number(partnerEarnings._sum?.netAmount ?? 0), pendingSettlements: pendingPartnerSettlements, markedPaidSettlements: paidPartnerSettlements, supportCases, incidents, capacityDenials: denials, goNoGoRecommendation: incidents > 0 || denials > 0 ? "REVIEW_REQUIRED" : "ADMIN_DECISION_REQUIRED" };
    }));
    return { date: start.toISOString().slice(0, 10), cities, generatedAt: new Date().toISOString(), privacy: "Summary only; no personal customer, Captain or Partner data included." };
  }

  async dailyReportCsv(date?: string) {
    const report = await this.dailyReport(date);
    const headers = ["date", "city", "ride_requests", "assigned_rides", "completed_rides", "cancelled_rides", "assignment_rate", "orders_created", "orders_completed", "failed_orders", "payment_total", "refund_total", "captain_earnings", "partner_earnings", "pending_settlements", "support_cases", "incidents", "capacity_denials", "recommendation"];
    const rows = report.cities.map((city) => [report.date, city.city, city.rideRequests, city.assignedRides, city.completedRides, city.cancelledRides, city.assignmentRate, city.ordersCreated, city.ordersCompleted, city.failedOrders, city.paymentTotal, city.refundTotal, city.captainEarnings, city.partnerEarnings, city.pendingSettlements, city.supportCases, city.incidents, city.capacityDenials, city.goNoGoRecommendation]);
    return [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  }
}
