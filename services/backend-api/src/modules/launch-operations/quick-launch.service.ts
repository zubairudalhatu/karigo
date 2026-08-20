import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountStatus,
  DeliveryCaptainApplicationStatus,
  ControlledSupplyGroupStatus,
  ControlledSupplyMemberType,
  LaunchChecklistItemStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchDrillType,
  LaunchServiceType,
  LaunchStage,
  Prisma,
  TaxiApplicationStatus,
  UserRole
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { nigerianPhoneSearchDigits } from "../../common/utils/phone.util";
import { AdminOperationsService } from "../admin-operations/admin-operations.service";
import { ControlledSupplyService } from "./controlled-supply.service";
import {
  FinishQuickLaunchDto,
  QuickLaunchCustomerSearchQueryDto,
  QuickLaunchSearchQueryDto,
  StartQuickLaunchDto
} from "./dto/launch-operations.dto";
import { LaunchOperationsService } from "./launch-operations.service";
import { customerHasServiceAreaAddress, CustomerAddressLocation } from "./customer-address-service-area";

const CITIES = [
  { code: "KANO", name: "Kano" },
  { code: "ABUJA", name: "Abuja" }
] as const;

const ORDER_SERVICES: LaunchServiceType[] = [
  LaunchServiceType.FOOD,
  LaunchServiceType.GROCERIES,
  LaunchServiceType.MARKETPLACE,
  LaunchServiceType.PARCEL_DELIVERY
];

const AUTOMATIC_CHECKS = new Set([
  "controlled_customer_ready",
  "controlled_captain_ready",
  "controlled_partner_ready",
  "capacity_limits_configured",
  "controlled_group_configured"
]);

type BaseCandidate = {
  userId: string;
  vendorId?: string;
  captainName?: string;
  captainCode?: string;
  phoneNumber?: string;
  businessName?: string;
  tradingName?: string;
  partnerCode?: string;
  references?: string[];
  city: string;
  lastGpsUpdate?: Date | string | null;
  capability?: string;
  rideStatus?: string;
  deliveryStatus?: string;
  blockers: string[];
  [key: string]: unknown;
};

@Injectable()
export class QuickLaunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly controlled: ControlledSupplyService,
    private readonly launch: LaunchOperationsService,
    private readonly adminOperations: AdminOperationsService
  ) {}

  private city(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized.includes("kano")) return CITIES[0];
    if (normalized === "fct" || normalized.includes("abuja") || normalized.includes("federal capital territory")) return CITIES[1];
    throw new BadRequestException("Quick Launch currently supports Kano and Abuja only");
  }

  private requirements(serviceType: LaunchServiceType) {
    return {
      customer: true,
      captain: serviceType === LaunchServiceType.RIDES || ORDER_SERVICES.includes(serviceType),
      partner: serviceType === LaunchServiceType.SME_SERVICES || ORDER_SERVICES.includes(serviceType)
    };
  }

  private quickBlocker(code: string, participant: "Captain" | "Partner", selectedCity: string) {
    const messages: Record<string, string> = {
      SUSPENDED: `${participant} is suspended`,
      LOGIN_NOT_READY: `${participant} operational access is not active`,
      APPLICATION_NOT_APPROVED: `${participant} application is not approved`,
      DOCUMENTS_NOT_APPROVED: `${participant} documents are not approved`,
      ACTIVATION_PENDING: `${participant} activation is incomplete`,
      PROFILE_INACTIVE: `${participant} activation is incomplete`,
      PROFILE_INCOMPLETE: `${participant} profile is incomplete`,
      CAPABILITY_NOT_FOUND: `${participant} capability is unavailable for the selected service`,
      CITY_MISMATCH: `${participant} is not approved for ${selectedCity}`,
      LOCATION_STALE: "GPS stale",
      ACTIVE_ASSIGNMENT: "Captain has a conflicting assignment",
      NO_ACTIVE_PRODUCT: "Partner has no active product",
      NO_ACTIVE_SERVICE: "Partner has no active service",
      NO_ACTIVE_DELIVERY_SERVICE: "Partner has no active delivery service",
      CAPABILITY_MISMATCH: "Partner capability does not match the selected service",
      TRASHED: "Partner account is in trash"
    };
    return messages[code] ?? `${participant} is not ready`;
  }

  private diagnosticCodes(blockers: string[]) {
    return [...new Set(blockers.map((code) => {
      if (code === "CITY_MISMATCH") return "CITY_MISMATCH";
      if (code === "LOCATION_STALE") return "LOCATION_STALE";
      if (["SUSPENDED", "LOGIN_NOT_READY", "TRASHED"].includes(code)) return "ACCOUNT_BLOCKED";
      if (["CAPABILITY_NOT_FOUND", "CAPABILITY_MISMATCH", "NO_ACTIVE_PRODUCT", "NO_ACTIVE_SERVICE", "NO_ACTIVE_DELIVERY_SERVICE"].includes(code)) return "CAPABILITY_NOT_FOUND";
      return "PROFILE_INCOMPLETE";
    }))];
  }

  private quickCandidate(candidate: BaseCandidate, participant: "Captain" | "Partner", serviceType: LaunchServiceType, selectedCity: string) {
    const setupOnly = new Set(["NOT_IN_CONTROLLED_GROUP", "MEMBERSHIP_ACTIVATION_PENDING"]);
    const blockingCodes = candidate.blockers.filter((code) => !setupOnly.has(code));
    const gpsArea = candidate.currentGpsArea && typeof candidate.currentGpsArea === "object"
      ? String((candidate.currentGpsArea as { cityName?: string }).cityName ?? selectedCity)
      : selectedCity;
    const online = candidate.onlineState === "ONLINE";
    const locationReady = participant !== "Captain" || Boolean(candidate.lastGpsUpdate) && !blockingCodes.includes("LOCATION_STALE");
    return {
      userId: candidate.userId,
      vendorId: candidate.vendorId,
      captainName: candidate.captainName,
      captainCode: candidate.captainCode,
      phoneNumber: candidate.phoneNumber,
      businessName: candidate.businessName,
      tradingName: candidate.tradingName,
      partnerCode: candidate.partnerCode,
      city: candidate.city,
      lastGpsUpdate: candidate.lastGpsUpdate,
      approvedOperatingAreas: candidate.approvedOperatingAreas,
      primaryOperatingArea: candidate.primaryOperatingArea,
      currentGpsArea: candidate.currentGpsArea,
      residentialLocation: candidate.residentialLocation,
      operatingAreasRequireReview: candidate.operatingAreasRequireReview,
      capabilityLabel: participant === "Captain"
        ? serviceType === LaunchServiceType.RIDES ? "Ride Captain" : "Delivery Captain"
        : candidate.capability === "BOTH" ? "Product Seller and Service Provider" : candidate.capability === "SERVICE_PROVIDER" ? "Service Provider" : "Product Seller",
      statusLabel: blockingCodes.length ? this.quickBlocker(blockingCodes[0], participant, selectedCity) : "Operational access ready",
      locationReadiness: participant === "Captain" ? locationReady ? online ? `Online — ${gpsArea}` : "Location verified — Offline" : "GPS stale" : undefined,
      accountReadiness: blockingCodes.some((code) => ["SUSPENDED", "LOGIN_NOT_READY", "TRASHED"].includes(code)) ? "Account blocked" : "Account ready",
      capabilityReadiness: blockingCodes.some((code) => ["APPLICATION_NOT_APPROVED", "DOCUMENTS_NOT_APPROVED", "ACTIVATION_PENDING", "PROFILE_INACTIVE", "PROFILE_INCOMPLETE", "CAPABILITY_NOT_FOUND", "CAPABILITY_MISMATCH"].includes(code)) ? "Capability blocked" : "Capability ready",
      assignmentReadiness: blockingCodes.includes("ACTIVE_ASSIGNMENT") ? "Assignment active" : "Assignment clear",
      ready: blockingCodes.length === 0,
      blockerCodes: [...new Set(blockingCodes)],
      diagnosticCodes: this.diagnosticCodes(blockingCodes),
      blockerMessages: [...new Set(blockingCodes.map((code) => this.quickBlocker(code, participant, selectedCity)))]
    };
  }

  private matches(candidate: Partial<BaseCandidate>, query?: string) {
    const term = query?.trim().toLowerCase();
    if (!term) return true;
    const textMatch = [candidate.captainName, candidate.captainCode, candidate.businessName, candidate.tradingName, candidate.partnerCode, ...(candidate.references ?? [])]
      .some((value) => String(value ?? "").toLowerCase().includes(term));
    const queryPhone = nigerianPhoneSearchDigits(term);
    const storedPhone = nigerianPhoneSearchDigits(candidate.phoneNumber ?? "");
    return textMatch || String(candidate.phoneNumber ?? "").toLowerCase().includes(term) || Boolean(queryPhone && storedPhone === queryPhone);
  }

  async customerCandidates(cityInput: string, query?: string) {
    const city = this.city(cityInput);
    const authoritativeUsers = await this.adminOperations.users();
    if (!authoritativeUsers.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: authoritativeUsers.map((user) => user.id) }, deletedAt: null },
      include: { customerProfile: true, addresses: { select: { city: true, state: true, latitude: true, longitude: true, isDefault: true } } },
      orderBy: { fullName: "asc" }
    });
    const term = query?.trim().toLowerCase();
    const phoneDigits = term ? nigerianPhoneSearchDigits(term) : null;
    return users.filter((user) => !user.deletedAt).filter((user) => !term
      ? user.role === UserRole.CUSTOMER || Boolean(user.customerProfile)
      : [user.fullName, user.phoneNumber, user.email, user.customerProfile?.referralCode].some((value) => String(value ?? "").toLowerCase().includes(term))
        || Boolean(phoneDigits && nigerianPhoneSearchDigits(user.phoneNumber) === phoneDigits))
      .map((user) => this.customerCandidate(city, user));
  }

  private customerCandidate(city: typeof CITIES[number], user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
    role?: UserRole;
    accountStatus: AccountStatus;
    phoneVerified: boolean;
    deletedAt?: Date | null;
    customerProfile: { referralCode: string } | null;
    addresses: CustomerAddressLocation[];
  }) {
    const cityMatches = customerHasServiceAreaAddress(user.addresses, city.code);
    const blockerCodes = [
      user.accountStatus !== AccountStatus.ACTIVE ? "ACCOUNT_BLOCKED" : null,
      !user.phoneVerified || !user.customerProfile ? "PROFILE_INCOMPLETE" : null,
      !cityMatches ? "CITY_MISMATCH" : null
    ].filter((item): item is string => Boolean(item));
    const blockerMessages = [
      user.accountStatus !== AccountStatus.ACTIVE ? "Customer account inactive" : null,
      !user.phoneVerified ? "Customer phone is not verified" : null,
      !user.customerProfile ? "Customer profile is incomplete" : null,
      !cityMatches ? `Customer has no address in ${city.name}` : null
    ].filter((item): item is string => Boolean(item));
    return {
      userId: user.id,
      fullName: user.fullName,
      name: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email ?? null,
      accountStatus: user.accountStatus,
      customerCode: user.customerProfile?.referralCode ?? null,
      city: city.name,
      capabilityLabel: "Customer",
      statusLabel: user.accountStatus === AccountStatus.ACTIVE ? "Customer account active" : "Customer account inactive",
      cityReadiness: cityMatches ? `Ready for ${city.name}` : `No ${city.name} service-area address`,
      ready: blockerMessages.length === 0,
      blockerCodes: [...new Set(blockerCodes)],
      diagnosticCodes: [...new Set(blockerCodes)],
      blockerMessages,
      technicalId: user.id
    };
  }

  async captainCandidates(city: string, serviceType: LaunchServiceType, query?: string) {
    const selectedCity = this.city(city).name;
    const [authoritativeCaptains, eligibleCandidates] = await Promise.all([
      this.adminOperations.riders(),
      this.controlled.captainEligibility(city, serviceType) as Promise<BaseCandidate[]>
    ]);
    const eligibilityByUser = new Map(eligibleCandidates.map((candidate) => [candidate.userId, candidate]));
    return authoritativeCaptains.map((source) => {
      const eligibility = eligibilityByUser.get(source.user.id);
      const rideCapability = Boolean(source.rideApplication || source.rideProfile);
      const deliveryCapability = Boolean(source.deliveryApplication || source.id);
      const requestedCapability = serviceType === LaunchServiceType.RIDES ? rideCapability : deliveryCapability;
      const blockers = [...(eligibility?.blockers ?? ["PROFILE_INCOMPLETE"]), ...(!requestedCapability ? ["CAPABILITY_NOT_FOUND"] : [])];
      const eligibilityAreas = Array.isArray(eligibility?.approvedOperatingAreas)
        ? eligibility.approvedOperatingAreas as Array<{ cityName?: string }>
        : [];
      const approvedCities = [...new Set(eligibilityAreas.map((area) => area.cityName).filter((value): value is string => Boolean(value)))];
      const candidate: BaseCandidate = {
        ...eligibility,
        userId: source.user.id,
        captainName: source.user.fullName,
        captainCode: source.riderCode ?? source.rideApplication?.applicationReference ?? source.deliveryApplication?.applicationReference ?? "NOT_ASSIGNED",
        references: [source.riderCode, source.rideApplication?.applicationReference, source.deliveryApplication?.applicationReference].filter((value): value is string => Boolean(value)),
        phoneNumber: source.phoneNumber,
        city: eligibility?.city ?? approvedCities[0] ?? "Not configured",
        blockers: [...new Set(blockers)]
      };
      return {
        ...this.quickCandidate(candidate, "Captain", serviceType, selectedCity),
        fullName: source.user.fullName,
        accountStatus: source.user.accountStatus,
        rideCapability,
        deliveryCapability,
        rideApplicationStatus: source.rideApplication?.status ?? "NOT_CONFIGURED",
        deliveryApplicationStatus: source.deliveryApplication?.status ?? "NOT_CONFIGURED",
        rideProfileStatus: source.rideProfile?.status ?? "NOT_CONFIGURED",
        deliveryProfileStatus: source.verificationStatus,
        approvedCities,
        vehicleReadiness: eligibility?.vehicle ? "READY" : "INCOMPLETE",
        documentReadiness: eligibility?.documentStatus ?? "INCOMPLETE",
        onlineState: eligibility?.onlineState ?? source.availabilityStatus,
        activeAssignment: Boolean(eligibility?.activeRide || eligibility?.activeDelivery),
        capabilityLabel: rideCapability && deliveryCapability ? "Ride and Delivery Captain" : rideCapability ? "Ride Captain" : "Delivery Captain"
      };
    }).filter((candidate) => this.matches(candidate, query));
  }

  async partnerCandidates(city: string, serviceType: LaunchServiceType, query?: string) {
    const selectedCity = this.city(city).name;
    const [authoritativePartners, eligibleCandidates] = await Promise.all([
      this.adminOperations.vendors(),
      this.controlled.partnerEligibility(city, serviceType) as Promise<BaseCandidate[]>
    ]);
    const eligibilityByVendor = new Map(eligibleCandidates.map((candidate) => [candidate.vendorId, candidate]));
    return authoritativePartners.map((source) => {
      const eligibility = eligibilityByVendor.get(source.id);
      const candidate: BaseCandidate = {
        ...eligibility,
        userId: source.userId,
        vendorId: source.id,
        businessName: source.businessName,
        tradingName: source.tradingName ?? undefined,
        partnerCode: source.applicationReference ?? undefined,
        phoneNumber: source.phoneNumber || source.user.phoneNumber,
        capability: eligibility?.capability ?? source.partnerType ?? "PRODUCT_SELLER",
        city: source.city,
        blockers: [...new Set(eligibility?.blockers ?? ["PROFILE_INCOMPLETE"])]
      };
      return {
        ...this.quickCandidate(candidate, "Partner", serviceType, selectedCity),
        fullName: source.user.fullName,
        email: source.email || source.user.email,
        accountStatus: source.user.accountStatus,
        lifecycleStatus: source.status,
        activeProductCount: eligibility?.activeProductCount ?? source.productCount,
        activeServiceCount: eligibility?.activeServiceCount ?? source.serviceCount,
        openOrderCount: eligibility?.openOrderCount ?? source.activeOrderCount,
        documentReadiness: eligibility?.documentStatus ?? "INCOMPLETE",
        onlineState: eligibility?.onlineState ?? (source.isOpen ? "ONLINE" : "OFFLINE")
      };
    }).filter((candidate) => this.matches(candidate, query));
  }

  private discoveryPage<T extends { ready: boolean; capabilityLabel?: string; diagnosticCodes?: string[] }>(
    candidates: T[],
    options: { query?: string; readiness?: "ALL" | "READY"; capability?: string; page?: number; pageSize?: number }
  ) {
    const capability = options.capability?.trim().toUpperCase();
    const filtered = candidates.filter((candidate) => {
      if (options.readiness === "READY" && !candidate.ready) return false;
      if (capability && capability !== "ALL" && !String(candidate.capabilityLabel ?? "").toUpperCase().includes(capability)) return false;
      return true;
    });
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    const diagnosticCode = candidates.length === 0
      ? "IDENTITY_NOT_FOUND"
      : filtered.length === 0
        ? options.readiness === "READY" ? "ACCOUNT_BLOCKED" : "CAPABILITY_NOT_FOUND"
        : filtered.every((candidate) => !candidate.ready)
          ? filtered.flatMap((candidate) => candidate.diagnosticCodes ?? [])[0] ?? "ACCOUNT_BLOCKED"
          : null;
    return {
      items,
      pagination: { page, pageSize, total: filtered.length, hasMore: start + pageSize < filtered.length },
      diagnosticCode
    };
  }

  async customerDiscovery(query: QuickLaunchCustomerSearchQueryDto) {
    return this.discoveryPage(await this.customerCandidates(query.city, query.query), query);
  }

  async captainDiscovery(query: QuickLaunchSearchQueryDto) {
    return this.discoveryPage(await this.captainCandidates(query.city, query.serviceType, query.query), query);
  }

  async partnerDiscovery(query: QuickLaunchSearchQueryDto) {
    return this.discoveryPage(await this.partnerCandidates(query.city, query.serviceType, query.query), query);
  }

  async identityDiagnostics() {
    const [
      users,
      riders,
      vendors,
      customersVisible,
      customerProfilesMissing,
      approvedRideApplicationsMissingUser,
      approvedDeliveryApplicationsMissingUser,
      taxiProfilesMissingUser,
      riderProfilesMissingVisibleUser,
      vendorsMissingVisibleUser
    ] = await Promise.all([
      this.adminOperations.users(),
      this.adminOperations.riders(),
      this.adminOperations.vendors(),
      this.prisma.user.count({ where: { deletedAt: null, OR: [{ role: UserRole.CUSTOMER }, { customerProfile: { isNot: null } }] } }),
      this.prisma.user.count({ where: { deletedAt: null, role: UserRole.CUSTOMER, customerProfile: { is: null } } }),
      this.prisma.taxiDriverApplication.count({ where: { status: TaxiApplicationStatus.APPROVED, applicantUserId: null } }),
      this.prisma.deliveryCaptainApplication.count({ where: { status: DeliveryCaptainApplicationStatus.APPROVED, applicantUserId: null } }),
      this.prisma.taxiDriverProfile.count({ where: { userId: null } }),
      this.prisma.rider.count({ where: { deletedAt: null, user: { deletedAt: { not: null } } } }),
      this.prisma.vendor.count({ where: { deletedAt: null, user: { deletedAt: { not: null } } } })
    ]);
    const rideCaptainsVisible = riders.filter((rider) => rider.rideApplication || rider.rideProfile).length;
    const deliveryCaptainsVisible = riders.length;
    return {
      sourceRoutes: {
        customers: "Admin Users / admin/users",
        captains: "Admin Captains/Riders / admin/riders",
        partners: "Admin Vendors / admin/vendors"
      },
      counts: {
        adminUsers: users.length,
        customersVisible,
        rideCaptainsVisible,
        deliveryCaptainsVisible,
        partnersVisible: vendors.length,
        identitiesMissingExpectedProfileLinks: customerProfilesMissing + taxiProfilesMissingUser + riderProfilesMissingVisibleUser + vendorsMissingVisibleUser,
        customerProfilesMissing,
        approvedCaptainApplicationsMissingUser: approvedRideApplicationsMissingUser + approvedDeliveryApplicationsMissingUser,
        profilesMissingUser: taxiProfilesMissingUser + riderProfilesMissingVisibleUser,
        vendorsMissingUser: vendorsMissingVisibleUser
      },
      readOnly: true,
      containsPrivateDocumentUrls: false
    };
  }

  async context(city: string, serviceType: LaunchServiceType) {
    const normalizedCity = this.city(city);
    const [checklist, configs] = await Promise.all([this.controlled.checklist(city, serviceType), this.launch.configs()]);
    const config = configs.find((item) => item.cityCode === normalizedCity.code && item.serviceType === serviceType);
    const currentStage = config?.launchStage ?? LaunchStage.OFF;
    const stageSafeForQuickLaunch = currentStage === LaunchStage.OFF || currentStage === LaunchStage.OPERATIONS_ONLY;
    const now = new Date();
    const manualBlockers = checklist.items.filter((item) => item.mandatory && !AUTOMATIC_CHECKS.has(item.key) && !(
      item.status === LaunchChecklistItemStatus.COMPLETE ||
      (item.status === LaunchChecklistItemStatus.WAIVED && item.waiverExpiresAt && item.waiverExpiresAt > now)
    ));
    return {
      requirements: this.requirements(serviceType),
      manualChecklistReady: manualBlockers.length === 0 && checklist.criticalFailures === 0,
      manualChecklistBlockers: manualBlockers.map((item) => item.label),
      criticalFailures: checklist.criticalFailures,
      currentStage,
      stageSafeForQuickLaunch,
      automaticChecks: [...AUTOMATIC_CHECKS]
    };
  }

  private drillType(serviceType: LaunchServiceType) {
    if (serviceType === LaunchServiceType.RIDES) return LaunchDrillType.RIDE_END_TO_END;
    if (serviceType === LaunchServiceType.PARCEL_DELIVERY) return LaunchDrillType.DELIVERY_END_TO_END;
    if (serviceType === LaunchServiceType.SME_SERVICES) return LaunchDrillType.SERVICE_REQUEST_END_TO_END;
    return LaunchDrillType.PRODUCT_ORDER_END_TO_END;
  }

  private configPayload(config: Awaited<ReturnType<LaunchOperationsService["configs"]>>[number], stage: LaunchStage, enabled: boolean, reason: string) {
    return {
      launchStage: stage,
      isEnabled: enabled,
      reason,
      confirmed: true,
      activeFrom: config.activeFrom?.toISOString(),
      activeUntil: config.activeUntil?.toISOString(),
      operatingHours: config.operatingHours && typeof config.operatingHours === "object" && !Array.isArray(config.operatingHours) ? config.operatingHours as Record<string, unknown> : undefined,
      allowedZoneIds: Array.isArray(config.allowedZoneIds) ? config.allowedZoneIds.filter((item): item is string => typeof item === "string") : undefined,
      inviteCohortId: config.inviteCohortId ?? undefined,
      maxConcurrentRequests: 1,
      maxUnassignedRequests: 1,
      minimumOnlineCaptainCount: config.minimumOnlineCaptainCount ?? undefined,
      minimumOnlinePartnerCount: config.minimumOnlinePartnerCount ?? undefined,
      assignmentTimeoutMinutes: config.assignmentTimeoutMinutes ?? undefined,
      captainLocationFreshMinutes: config.captainLocationFreshMinutes ?? undefined,
      customerMessage: config.customerMessage ?? undefined,
      closedMessage: config.closedMessage ?? undefined,
      internalNote: config.internalNote ?? undefined
    };
  }

  private async assertParticipants(dto: StartQuickLaunchDto) {
    const required = this.requirements(dto.serviceType);
    if (required.captain && !dto.captainUserId) throw new BadRequestException("Select a ready Captain for this service");
    if (required.partner && !dto.partnerVendorId) throw new BadRequestException("Select a ready Partner for this service");

    const city = this.city(dto.city);
    const customerAccount = await this.prisma.user.findFirst({
      where: { id: dto.customerUserId, deletedAt: null },
      include: { customerProfile: true, addresses: { select: { city: true, state: true, latitude: true, longitude: true } } }
    });
    if (!customerAccount) throw new BadRequestException("Selected Customer account was not found");
    const customer = this.customerCandidate(city, customerAccount);
    if (!customer.ready) throw new BadRequestException(customer.blockerMessages.join("; "));

    if (required.captain) {
      const baseCaptain = (await this.controlled.captainEligibility(dto.city, dto.serviceType) as BaseCandidate[]).find((item) => item.userId === dto.captainUserId);
      if (!baseCaptain) throw new BadRequestException("Selected Captain account was not found");
      const captain = this.quickCandidate(baseCaptain, "Captain", dto.serviceType, city.name);
      if (!captain.ready) throw new BadRequestException(captain.blockerMessages.join("; "));
    }
    if (required.partner) {
      const basePartner = (await this.controlled.partnerEligibility(dto.city, dto.serviceType) as BaseCandidate[]).find((item) => item.vendorId === dto.partnerVendorId);
      if (!basePartner) throw new BadRequestException("Selected Partner account was not found");
      const partner = this.quickCandidate(basePartner, "Partner", dto.serviceType, city.name);
      if (!partner.ready) throw new BadRequestException(partner.blockerMessages.join("; "));
    }
    return customer;
  }

  private async ensureGroup(adminUserId: string, cityCode: string, cityName: string, serviceType: LaunchServiceType, reason: string) {
    let group = await this.prisma.controlledSupplyGroup.findFirst({
      where: { cityCode, serviceType, status: { in: [ControlledSupplyGroupStatus.ACTIVE, ControlledSupplyGroupStatus.DRAFT, ControlledSupplyGroupStatus.PAUSED] } },
      include: { members: true },
      orderBy: { createdAt: "desc" }
    });
    if (!group || group.members.length >= group.maximumMembers) {
      group = await this.controlled.createGroup(adminUserId, {
        name: `Quick Launch ${cityName} ${serviceType.replaceAll("_", " ")}`,
        city: cityName,
        serviceType,
        maximumMembers: 4,
        internalNote: "Quick Launch controlled group; retained for advanced Operations management"
      }) as typeof group;
    }
    if (!group) throw new BadRequestException("Unable to prepare a controlled supply group");
    if (group.status !== ControlledSupplyGroupStatus.ACTIVE) {
      await this.controlled.updateGroup(group.id, adminUserId, { status: ControlledSupplyGroupStatus.ACTIVE, reason });
      group = { ...group, status: ControlledSupplyGroupStatus.ACTIVE };
    }
    return group;
  }

  private async ensureMember(group: {
    id: string;
    members: Array<{ id: string; captainUserId: string | null; vendorId: string | null; enabled: boolean; memberType: ControlledSupplyMemberType }>;
  }, adminUserId: string, memberType: ControlledSupplyMemberType, reason: string, identity: { captainUserId?: string; vendorId?: string }) {
    let member = group.members.find((item) => identity.captainUserId ? item.captainUserId === identity.captainUserId : item.vendorId === identity.vendorId);
    if (!member) {
      const created = await this.controlled.addMember(group.id, adminUserId, { memberType, ...identity, reason });
      member = created;
      group.members.push(created);
    }
    if (!member.enabled) await this.controlled.updateMember(group.id, member.id, adminUserId, { enabled: true, reason });
    return member;
  }

  private async completeAutomaticChecks(city: string, serviceType: LaunchServiceType, adminUserId: string) {
    const checklist = await this.controlled.checklist(city, serviceType);
    const required = this.requirements(serviceType);
    for (const item of checklist.items.filter((candidate) => AUTOMATIC_CHECKS.has(candidate.key) && candidate.status !== LaunchChecklistItemStatus.COMPLETE)) {
      const notApplicable = (item.key === "controlled_captain_ready" && !required.captain) || (item.key === "controlled_partner_ready" && !required.partner);
      await this.controlled.updateChecklist(city, serviceType, item.id, adminUserId, {
        status: LaunchChecklistItemStatus.COMPLETE,
        note: notApplicable ? `Not required for ${serviceType.replaceAll("_", " ")} Quick Launch` : "Verified automatically by Quick Launch controlled setup"
      });
    }
  }

  async start(adminUserId: string, dto: StartQuickLaunchDto) {
    if (!dto.confirmed) throw new BadRequestException("Quick Launch requires confirmation before changing production controls");
    const city = this.city(dto.city);
    const context = await this.context(city.name, dto.serviceType);
    if (!context.stageSafeForQuickLaunch) throw new BadRequestException(`Return ${city.name} ${dto.serviceType.replaceAll("_", " ")} to OFF in Advanced Controls before using Quick Launch`);
    if (!context.manualChecklistReady) {
      const blockers = context.manualChecklistBlockers.join(", ");
      throw new BadRequestException(`Complete the manual Operations checks before Quick Launch${blockers ? `: ${blockers}` : ""}${context.criticalFailures ? `; ${context.criticalFailures} critical drill blocker(s)` : ""}`);
    }
    const customerCandidate = await this.assertParticipants(dto);
    const reason = dto.reason.trim();
    const configs = await this.launch.configs();
    const config = configs.find((item) => item.cityCode === city.code && item.serviceType === dto.serviceType);
    if (!config) throw new BadRequestException("Selected city/service launch configuration was not found");
    await this.launch.updateConfig(city.name, dto.serviceType, adminUserId, this.configPayload(config, LaunchStage.OFF, false, `${reason} — Quick Launch safe preparation`));

    const group = await this.ensureGroup(adminUserId, city.code, city.name, dto.serviceType, reason);
    const required = this.requirements(dto.serviceType);
    if (required.captain) {
      await this.ensureMember(group, adminUserId, dto.serviceType === LaunchServiceType.RIDES ? ControlledSupplyMemberType.RIDE_CAPTAIN : ControlledSupplyMemberType.DELIVERY_CAPTAIN, reason, { captainUserId: dto.captainUserId });
    }
    if (required.partner) {
      await this.ensureMember(group, adminUserId, dto.serviceType === LaunchServiceType.SME_SERVICES ? ControlledSupplyMemberType.SERVICE_PROVIDER : ControlledSupplyMemberType.PRODUCT_SELLER, reason, { vendorId: dto.partnerVendorId });
    }

    let customer = await this.prisma.controlledOperationsCustomer.findUnique({ where: { userId: dto.customerUserId } });
    if (!customer || customer.cityCode !== city.code) {
      customer = await this.controlled.addCustomer(adminUserId, { city: city.name, userId: dto.customerUserId, label: customerCandidate.name, internalNote: "Quick Launch Operations Customer; excluded from campaigns" });
    }
    if (!customer.enabled) customer = await this.controlled.updateCustomer(customer.id, adminUserId, { enabled: true, reason });

    await this.completeAutomaticChecks(city.name, dto.serviceType, adminUserId);
    const activeConfig = await this.launch.updateConfig(city.name, dto.serviceType, adminUserId, this.configPayload(config, LaunchStage.OPERATIONS_ONLY, true, reason));

    const partner = dto.partnerVendorId ? await this.prisma.vendor.findUnique({ where: { id: dto.partnerVendorId }, select: { userId: true } }) : null;
    const drill = await this.launch.createDrill(adminUserId, {
      city: city.name,
      serviceType: dto.serviceType,
      drillType: this.drillType(dto.serviceType),
      customerUserId: dto.customerUserId,
      captainUserId: dto.captainUserId,
      partnerUserId: partner?.userId,
      controlledCustomerId: customer.id,
      controlledSupplyGroupId: group.id,
      notes: `Quick Launch started: ${reason}`
    });
    const startedDrill = await this.launch.updateDrill(drill.id, adminUserId, { result: LaunchDrillResult.IN_PROGRESS, notes: `Quick Launch controlled test started: ${reason}` });
    return { city, serviceType: dto.serviceType, config: activeConfig, controlledGroup: { id: group.id, name: group.name }, controlledCustomer: { id: customer.id, label: customer.label }, drill: startedDrill };
  }

  async finish(drillId: string, adminUserId: string, dto: FinishQuickLaunchDto) {
    if (!dto.confirmed) throw new BadRequestException("Finishing a Quick Launch test requires confirmation");
    if (dto.outcome !== "PASSED" && !dto.returnServiceOff) throw new BadRequestException("Failed or stopped tests must return the selected service OFF");
    const drill = await this.prisma.launchDrill.findUnique({ where: { id: drillId }, include: { steps: true } });
    if (!drill?.serviceType) throw new NotFoundException("Quick Launch drill not found");
    if (dto.outcome === "PASSED" && drill.steps.some((step) => step.status !== LaunchDrillStepStatus.PASSED)) throw new BadRequestException("Pass every guided test step before passing the drill");

    let config = null;
    if (dto.returnServiceOff) {
      const configs = await this.launch.configs();
      const existing = configs.find((item) => item.cityCode === drill.cityCode && item.serviceType === drill.serviceType);
      if (!existing) throw new BadRequestException("Drill launch configuration was not found");
      config = await this.launch.updateConfig(drill.cityCode, drill.serviceType, adminUserId, this.configPayload(existing, LaunchStage.OFF, false, dto.reason.trim()));
    }
    const result = dto.outcome === "PASSED" ? LaunchDrillResult.PASSED : LaunchDrillResult.FAILED;
    const updatedDrill = await this.launch.updateDrill(drill.id, adminUserId, {
      result,
      failureStage: dto.outcome === "PASSED" ? undefined : dto.outcome === "STOPPED" ? "Stopped by Operations" : "Controlled test failed",
      notes: dto.reason.trim(),
      criticalFailure: false
    });
    return { drill: updatedDrill, config, serviceReturnedOff: dto.returnServiceOff, activeTransactionsPreserved: true };
  }
}
