import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountStatus,
  ControlledSupplyGroupStatus,
  ControlledSupplyMemberType,
  LaunchChecklistItemStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchDrillType,
  LaunchServiceType,
  LaunchStage,
  Prisma,
  UserRole
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ControlledSupplyService } from "./controlled-supply.service";
import { FinishQuickLaunchDto, StartQuickLaunchDto } from "./dto/launch-operations.dto";
import { LaunchOperationsService } from "./launch-operations.service";

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
  city: string;
  lastGpsUpdate?: Date | string | null;
  blockers: string[];
  [key: string]: unknown;
};

@Injectable()
export class QuickLaunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly controlled: ControlledSupplyService,
    private readonly launch: LaunchOperationsService
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

  private quickBlocker(code: string, participant: "Captain" | "Partner") {
    const messages: Record<string, string> = {
      SUSPENDED: `${participant} is suspended`,
      LOGIN_NOT_READY: `${participant} operational access is not active`,
      APPLICATION_NOT_APPROVED: `${participant} application is not approved`,
      DOCUMENTS_NOT_APPROVED: `${participant} documents are not approved`,
      PROFILE_INACTIVE: `${participant} activation is incomplete`,
      CITY_MISMATCH: `${participant} is not approved for the selected city`,
      LOCATION_STALE: "Refresh Captain GPS",
      ACTIVE_ASSIGNMENT: "Captain has a conflicting assignment",
      NO_ACTIVE_PRODUCT: "Partner has no active product",
      NO_ACTIVE_SERVICE: "Partner has no active service",
      NO_ACTIVE_DELIVERY_SERVICE: "Partner has no active delivery service",
      CAPABILITY_MISMATCH: "Partner capability does not match the selected service",
      TRASHED: "Partner account is in trash"
    };
    return messages[code] ?? `${participant} is not ready`;
  }

  private quickCandidate(candidate: BaseCandidate, participant: "Captain" | "Partner") {
    const setupOnly = new Set(["NOT_IN_CONTROLLED_GROUP", "ACTIVATION_PENDING"]);
    const blockingCodes = candidate.blockers.filter((code) => !setupOnly.has(code));
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
      ready: blockingCodes.length === 0,
      blockerMessages: [...new Set(blockingCodes.map((code) => this.quickBlocker(code, participant)))]
    };
  }

  private matches(candidate: BaseCandidate, query?: string) {
    const term = query?.trim().toLowerCase();
    if (!term) return true;
    return [candidate.captainName, candidate.captainCode, candidate.phoneNumber, candidate.businessName, candidate.tradingName, candidate.partnerCode]
      .some((value) => String(value ?? "").toLowerCase().includes(term));
  }

  async customerCandidates(cityInput: string, query?: string) {
    const city = this.city(cityInput);
    const term = query?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        deletedAt: null,
        customerProfile: { isNot: null },
        ...(term ? { OR: [
          { fullName: { contains: term, mode: "insensitive" } },
          { phoneNumber: { contains: term } },
          { customerProfile: { referralCode: { contains: term, mode: "insensitive" } } }
        ] } : {})
      },
      include: { customerProfile: true, addresses: { select: { city: true, state: true, isDefault: true } } },
      orderBy: { fullName: "asc" },
      take: 50
    });
    return users.map((user) => this.customerCandidate(city, user));
  }

  private customerCandidate(city: typeof CITIES[number], user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    accountStatus: AccountStatus;
    phoneVerified: boolean;
    customerProfile: { referralCode: string } | null;
    addresses: Array<{ city: string; state: string }>;
  }) {
    const cityMatches = user.addresses.some((address) => {
      try { return this.city(`${address.city} ${address.state}`).code === city.code; } catch { return false; }
    });
    const blockers = [
      user.accountStatus !== AccountStatus.ACTIVE ? "Customer account inactive" : null,
      !user.phoneVerified ? "Customer phone is not verified" : null,
      !cityMatches ? "Customer has no address in the selected service area" : null
    ].filter((item): item is string => Boolean(item));
    return {
      userId: user.id,
      name: user.fullName,
      phoneNumber: user.phoneNumber,
      customerCode: user.customerProfile?.referralCode ?? null,
      city: city.name,
      ready: blockers.length === 0,
      blockerMessages: blockers,
      technicalId: user.id
    };
  }

  async captainCandidates(city: string, serviceType: LaunchServiceType, query?: string) {
    const candidates = await this.controlled.captainEligibility(city, serviceType) as BaseCandidate[];
    return candidates.filter((item) => this.matches(item, query)).map((item) => this.quickCandidate(item, "Captain")).slice(0, 50);
  }

  async partnerCandidates(city: string, serviceType: LaunchServiceType, query?: string) {
    const candidates = await this.controlled.partnerEligibility(city, serviceType) as BaseCandidate[];
    return candidates.filter((item) => this.matches(item, query)).map((item) => this.quickCandidate(item, "Partner")).slice(0, 50);
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
      where: { id: dto.customerUserId, role: UserRole.CUSTOMER, deletedAt: null, customerProfile: { isNot: null } },
      include: { customerProfile: true, addresses: { select: { city: true, state: true } } }
    });
    if (!customerAccount) throw new BadRequestException("Selected Customer account was not found");
    const customer = this.customerCandidate(city, customerAccount);
    if (!customer.ready) throw new BadRequestException(customer.blockerMessages.join("; "));

    if (required.captain) {
      const baseCaptain = (await this.controlled.captainEligibility(dto.city, dto.serviceType) as BaseCandidate[]).find((item) => item.userId === dto.captainUserId);
      if (!baseCaptain) throw new BadRequestException("Selected Captain account was not found");
      const captain = this.quickCandidate(baseCaptain, "Captain");
      if (!captain.ready) throw new BadRequestException(captain.blockerMessages.join("; "));
    }
    if (required.partner) {
      const basePartner = (await this.controlled.partnerEligibility(dto.city, dto.serviceType) as BaseCandidate[]).find((item) => item.vendorId === dto.partnerVendorId);
      if (!basePartner) throw new BadRequestException("Selected Partner account was not found");
      const partner = this.quickCandidate(basePartner, "Partner");
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
