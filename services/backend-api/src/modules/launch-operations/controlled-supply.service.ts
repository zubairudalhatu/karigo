import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountStatus,
  ControlledSupplyGroupStatus,
  ControlledSupplyMemberType,
  DeliveryCaptainApplicationStatus,
  DocumentVerificationStatus,
  LaunchChecklistItemStatus,
  LaunchDrillResult,
  LaunchServiceType,
  RiderStatus,
  TaxiApplicationStatus,
  TaxiDriverProfileStatus,
  UserRole,
  VendorApplicationStatus,
  VendorStatus
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AddControlledOperationsCustomerDto,
  AddControlledSupplyMemberDto,
  CreateControlledSupplyGroupDto,
  UpdateControlledOperationsCustomerDto,
  UpdateControlledSupplyGroupDto,
  UpdateControlledSupplyMemberDto,
  UpdateOperationsChecklistItemDto
} from "./dto/launch-operations.dto";

const CONTROLLED_CITIES = [
  { code: "KANO", name: "Kano" },
  { code: "ABUJA", name: "Abuja" }
] as const;

const CAPTAIN_MEMBER_TYPES: ControlledSupplyMemberType[] = [
  ControlledSupplyMemberType.RIDE_CAPTAIN,
  ControlledSupplyMemberType.DELIVERY_CAPTAIN,
  ControlledSupplyMemberType.DUAL_MODE_CAPTAIN
];
const PARTNER_MEMBER_TYPES: ControlledSupplyMemberType[] = [
  ControlledSupplyMemberType.PRODUCT_SELLER,
  ControlledSupplyMemberType.SERVICE_PROVIDER,
  ControlledSupplyMemberType.MIXED_PARTNER
];
const OPERATIONS_CHECKS = [
  ["backend_healthy", "Backend healthy"],
  ["no_open_sev1", "No open SEV1"],
  ["no_blocking_sev2", "No blocking SEV2"],
  ["support_queue_operational", "Support queue operational"],
  ["duty_operations_owner", "Duty Operations owner assigned"],
  ["controlled_customer_ready", "Controlled Customer account ready"],
  ["controlled_captain_ready", "Controlled Captain ready where applicable"],
  ["controlled_partner_ready", "Controlled Partner ready where applicable"],
  ["payment_test_method_ready", "Payment test method ready"],
  ["reconciliation_owner", "Reconciliation owner assigned"],
  ["incident_pause_tested", "Incident pause control tested"],
  ["operating_hours_configured", "Operating hours configured"],
  ["capacity_limits_configured", "Capacity limits configured"],
  ["controlled_group_configured", "City/service controlled group configured"]
] as const;

@Injectable()
export class ControlledSupplyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  private city(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized.includes("kano")) return CONTROLLED_CITIES[0];
    if (normalized === "fct" || normalized.includes("abuja") || normalized.includes("federal capital territory")) return CONTROLLED_CITIES[1];
    throw new BadRequestException("Controlled production operations currently support Kano and Abuja only");
  }

  private activeWindow(group: { startAt: Date | null; endAt: Date | null }, now = new Date()) {
    return (!group.startAt || group.startAt <= now) && (!group.endAt || group.endAt >= now);
  }

  private requiredMemberTypes(serviceType: LaunchServiceType, role: UserRole): ControlledSupplyMemberType[] {
    if (role === UserRole.RIDER) {
      return serviceType === LaunchServiceType.RIDES
        ? [ControlledSupplyMemberType.RIDE_CAPTAIN, ControlledSupplyMemberType.DUAL_MODE_CAPTAIN]
        : [ControlledSupplyMemberType.DELIVERY_CAPTAIN, ControlledSupplyMemberType.DUAL_MODE_CAPTAIN];
    }
    if (serviceType === LaunchServiceType.SME_SERVICES) return [ControlledSupplyMemberType.SERVICE_PROVIDER, ControlledSupplyMemberType.MIXED_PARTNER];
    return [ControlledSupplyMemberType.PRODUCT_SELLER, ControlledSupplyMemberType.MIXED_PARTNER];
  }

  private assertMemberTypeMatchesService(memberType: ControlledSupplyMemberType, serviceType: LaunchServiceType) {
    if (memberType === ControlledSupplyMemberType.RIDE_CAPTAIN && serviceType !== LaunchServiceType.RIDES) {
      throw new BadRequestException("Ride Captains can only join a RIDES controlled group");
    }
    if (memberType === ControlledSupplyMemberType.DELIVERY_CAPTAIN && (serviceType === LaunchServiceType.RIDES || serviceType === LaunchServiceType.SME_SERVICES)) {
      throw new BadRequestException("Delivery Captains require an order or delivery controlled group");
    }
    if (memberType === ControlledSupplyMemberType.DUAL_MODE_CAPTAIN && serviceType === LaunchServiceType.SME_SERVICES) {
      throw new BadRequestException("Dual-mode Captains require a Ride, order or delivery controlled group");
    }
    if (memberType === ControlledSupplyMemberType.PRODUCT_SELLER && (serviceType === LaunchServiceType.RIDES || serviceType === LaunchServiceType.SME_SERVICES)) {
      throw new BadRequestException("Product Sellers require a product or order controlled group");
    }
    if (memberType === ControlledSupplyMemberType.SERVICE_PROVIDER && serviceType !== LaunchServiceType.SME_SERVICES) {
      throw new BadRequestException("Service Providers can only join an SME_SERVICES controlled group");
    }
    if (PARTNER_MEMBER_TYPES.includes(memberType) && serviceType === LaunchServiceType.RIDES) {
      throw new BadRequestException("Partners cannot join a RIDES controlled group");
    }
  }

  async groups(cityInput?: string) {
    const cityCode = cityInput ? this.city(cityInput).code : undefined;
    const groups = await this.prisma.controlledSupplyGroup.findMany({
      where: cityCode ? { cityCode } : undefined,
      include: { members: { orderBy: { createdAt: "desc" } }, _count: { select: { members: true } } },
      orderBy: [{ cityCode: "asc" }, { serviceType: "asc" }, { createdAt: "desc" }]
    });
    return groups.map((group) => ({ ...group, activeWindow: this.activeWindow(group) }));
  }

  async createGroup(adminUserId: string, dto: CreateControlledSupplyGroupDto) {
    const city = this.city(dto.city);
    if (dto.startAt && dto.endAt && new Date(dto.startAt) >= new Date(dto.endAt)) throw new BadRequestException("endAt must be after startAt");
    const group = await this.prisma.controlledSupplyGroup.create({ data: {
      name: dto.name.trim(), cityCode: city.code, serviceType: dto.serviceType,
      maximumMembers: dto.maximumMembers, startAt: dto.startAt ? new Date(dto.startAt) : null,
      endAt: dto.endAt ? new Date(dto.endAt) : null, internalNote: dto.internalNote?.trim(), createdByAdminId: adminUserId
    }, include: { members: true } });
    await this.audit.record(adminUserId, "admin.production_launch.controlled_group_created", "ControlledSupplyGroup", group.id, { cityCode: city.code, serviceType: dto.serviceType, maximumMembers: dto.maximumMembers });
    return group;
  }

  async updateGroup(id: string, adminUserId: string, dto: UpdateControlledSupplyGroupDto) {
    const group = await this.prisma.controlledSupplyGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Controlled supply group not found");
    const updated = await this.prisma.controlledSupplyGroup.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record(adminUserId, "admin.production_launch.controlled_group_status_changed", "ControlledSupplyGroup", id, { previousStatus: group.status, newStatus: dto.status, reason: dto.reason.trim() });
    return updated;
  }

  async addMember(groupId: string, adminUserId: string, dto: AddControlledSupplyMemberDto) {
    const group = await this.prisma.controlledSupplyGroup.findUnique({ where: { id: groupId }, include: { _count: { select: { members: true } } } });
    if (!group) throw new NotFoundException("Controlled supply group not found");
    if (group._count.members >= group.maximumMembers) throw new BadRequestException("Controlled supply group member limit reached");
    this.assertMemberTypeMatchesService(dto.memberType, group.serviceType);
    const captainType = CAPTAIN_MEMBER_TYPES.includes(dto.memberType);
    const partnerType = PARTNER_MEMBER_TYPES.includes(dto.memberType);
    if (captainType === Boolean(dto.vendorId) || partnerType === Boolean(dto.captainUserId)) throw new BadRequestException("Select exactly one matching Captain or Partner identity");

    if (captainType) {
      const captain = await this.prisma.user.findFirst({
        where: { id: dto.captainUserId, role: UserRole.RIDER, deletedAt: null },
        include: { rider: true, taxiDriverProfiles: true, deliveryCaptainApplications: true }
      });
      if (!captain) throw new BadRequestException("Captain account not found");
      const cities = [captain.deliveryCaptainApplications[0]?.city, ...captain.taxiDriverProfiles.map((profile) => profile.city)]
        .filter(Boolean)
        .flatMap((value) => {
          try { return [this.city(String(value)).code]; } catch { return []; }
        });
      if (!cities.includes(group.cityCode as typeof cities[number])) throw new BadRequestException("Captain city does not match the controlled group");
    } else {
      const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, deletedAt: null }, select: { id: true, city: true } });
      if (!vendor) throw new BadRequestException("Partner account not found");
      if (this.city(vendor.city).code !== group.cityCode) throw new BadRequestException("Partner city does not match the controlled group");
    }

    const existing = await this.prisma.controlledSupplyMember.findFirst({ where: { groupId, captainUserId: dto.captainUserId ?? null, vendorId: dto.vendorId ?? null } });
    if (existing) throw new BadRequestException("This Captain or Partner is already in the controlled group");
    const member = await this.prisma.controlledSupplyMember.create({ data: { groupId, memberType: dto.memberType, captainUserId: dto.captainUserId, vendorId: dto.vendorId, reason: dto.reason.trim(), addedByAdminId: adminUserId } });
    await this.audit.record(adminUserId, "admin.production_launch.controlled_member_added", "ControlledSupplyMember", member.id, { groupId, memberType: dto.memberType, reason: dto.reason.trim() });
    return member;
  }

  async updateMember(groupId: string, memberId: string, adminUserId: string, dto: UpdateControlledSupplyMemberDto) {
    const member = await this.prisma.controlledSupplyMember.findFirst({ where: { id: memberId, groupId }, include: { group: true } });
    if (!member) throw new NotFoundException("Controlled supply member not found");
    if (dto.enabled && (member.group.status !== ControlledSupplyGroupStatus.ACTIVE || !this.activeWindow(member.group))) throw new BadRequestException("Activate the controlled group and confirm its operating window before enabling members");
    if (dto.enabled) {
      const candidate = member.captainUserId
        ? (await this.captainEligibility(member.group.cityCode, member.group.serviceType)).find((item) => item.userId === member.captainUserId)
        : (await this.partnerEligibility(member.group.cityCode, member.group.serviceType)).find((item) => item.vendorId === member.vendorId);
      const blocking = candidate?.blockers.filter((code) => code !== "ACTIVATION_PENDING" && code !== "NOT_IN_CONTROLLED_GROUP") ?? ["PROFILE_INACTIVE"];
      if (blocking.length) throw new BadRequestException(`Controlled activation blocked: ${blocking.join(", ")}`);
    }
    const updated = await this.prisma.controlledSupplyMember.update({ where: { id: memberId }, data: { enabled: dto.enabled, reason: dto.reason.trim(), activatedAt: dto.enabled ? new Date() : member.activatedAt, deactivatedAt: dto.enabled ? null : new Date() } });
    await this.audit.record(adminUserId, dto.enabled ? "admin.production_launch.controlled_member_activated" : "admin.production_launch.controlled_member_deactivated", "ControlledSupplyMember", memberId, { groupId, reason: dto.reason.trim() });
    return updated;
  }

  private documentsApproved(documents: Array<{ verificationStatus?: DocumentVerificationStatus; reviewStatus?: DocumentVerificationStatus }>) {
    return documents.length > 0 && documents.every((document) => (document.verificationStatus ?? document.reviewStatus) === DocumentVerificationStatus.APPROVED);
  }

  async captainEligibility(cityInput: string, serviceType: LaunchServiceType) {
    const city = this.city(cityInput);
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.RIDER, deletedAt: null },
      include: {
        rider: { include: { documents: true } },
        taxiDriverProfiles: { include: { application: { include: { captainDocuments: { where: { deletedAt: null } } } } } },
        deliveryCaptainApplications: { include: { captainDocuments: { where: { deletedAt: null } }, documents: true }, orderBy: { createdAt: "desc" } },
        captainWorkState: true
      }
    });
    const memberships = await this.prisma.controlledSupplyMember.findMany({ where: { captainUserId: { in: users.map((user) => user.id) }, group: { cityCode: city.code, serviceType } }, include: { group: true } });
    const requiredTypes = this.requiredMemberTypes(serviceType, UserRole.RIDER);
    const freshnessMinutes = (await this.prisma.launchMarketConfig.findUnique({ where: { cityCode_serviceType: { cityCode: city.code, serviceType } }, select: { captainLocationFreshMinutes: true } }))?.captainLocationFreshMinutes ?? 15;
    const freshAfter = new Date(Date.now() - freshnessMinutes * 60_000);

    return users.map((user) => {
      const rideProfile = user.taxiDriverProfiles.find((profile) => {
        try { return this.city(profile.city).code === city.code; } catch { return false; }
      });
      const deliveryApplication = user.deliveryCaptainApplications.find((application) => {
        try { return this.city(application.city).code === city.code; } catch { return false; }
      });
      const needsRide = serviceType === LaunchServiceType.RIDES;
      const profile = needsRide ? rideProfile : user.rider;
      const applicationApproved = needsRide ? rideProfile?.application?.status === TaxiApplicationStatus.APPROVED : deliveryApplication?.status === DeliveryCaptainApplicationStatus.APPROVED;
      const documents = needsRide ? rideProfile?.application?.captainDocuments ?? [] : [...(deliveryApplication?.captainDocuments ?? []), ...(deliveryApplication?.documents ?? [])];
      const profileActive = needsRide ? rideProfile?.status === TaxiDriverProfileStatus.ACTIVE : user.rider?.verificationStatus === RiderStatus.ACTIVE;
      const locationAt = needsRide ? rideProfile?.lastSeenAt : (user.captainWorkState?.lastLocationAt ?? user.rider?.currentLocationUpdatedAt);
      const vehicleValid = needsRide
        ? Boolean(rideProfile?.vehicleMake && rideProfile.vehicleModel && rideProfile.vehiclePlateNumber)
        : Boolean(user.rider?.vehicleType && user.rider.plateNumber);
      const membership = memberships.find((item) => item.captainUserId === user.id && requiredTypes.includes(item.memberType) && item.group.status === ControlledSupplyGroupStatus.ACTIVE && this.activeWindow(item.group));
      const blockers: string[] = [];
      if (user.accountStatus === AccountStatus.SUSPENDED || user.rider?.verificationStatus === RiderStatus.SUSPENDED || rideProfile?.status === TaxiDriverProfileStatus.SUSPENDED) blockers.push("SUSPENDED");
      if (user.accountStatus !== AccountStatus.ACTIVE || !user.phoneVerified || (!user.lastLoginAt && !user.onboardingPasswordSetAt)) blockers.push("LOGIN_NOT_READY");
      if (!applicationApproved) blockers.push("APPLICATION_NOT_APPROVED");
      if (!this.documentsApproved(documents)) blockers.push("DOCUMENTS_NOT_APPROVED");
      if (!profileActive) blockers.push(profile && "status" in profile && profile.status === TaxiDriverProfileStatus.PENDING_ACTIVATION ? "ACTIVATION_PENDING" : "PROFILE_INACTIVE");
      if (!rideProfile && needsRide || !deliveryApplication && !needsRide) blockers.push("CITY_MISMATCH");
      if (!vehicleValid) blockers.push("PROFILE_INACTIVE");
      if (!locationAt || locationAt < freshAfter) blockers.push("LOCATION_STALE");
      if (user.captainWorkState?.activeDeliveryAssignmentId || user.captainWorkState?.activeRideTripId) blockers.push("ACTIVE_ASSIGNMENT");
      if (!membership) blockers.push("NOT_IN_CONTROLLED_GROUP");
      else if (!membership.enabled) blockers.push("ACTIVATION_PENDING");
      return {
        userId: user.id, captainName: user.fullName, captainCode: user.rider?.riderCode ?? rideProfile?.id ?? "NOT_ASSIGNED", city: city.name,
        rideStatus: rideProfile?.status ?? "NOT_CONFIGURED", deliveryStatus: user.rider?.verificationStatus ?? "NOT_CONFIGURED",
        onlineState: user.captainWorkState?.desiredRideOnline || user.captainWorkState?.desiredDeliveryOnline ? "ONLINE" : "OFFLINE",
        activeRide: Boolean(user.captainWorkState?.activeRideTripId), activeDelivery: Boolean(user.captainWorkState?.activeDeliveryAssignmentId),
        lastGpsUpdate: locationAt, vehicle: needsRide ? [rideProfile?.vehicleMake, rideProfile?.vehicleModel, rideProfile?.vehiclePlateNumber].filter(Boolean).join(" ") : [user.rider?.vehicleType, user.rider?.plateNumber].filter(Boolean).join(" "),
        documentStatus: this.documentsApproved(documents) ? "APPROVED" : "INCOMPLETE", eligibility: blockers[0] ?? "ELIGIBLE", blockers: [...new Set(blockers)],
        controlledGroup: membership ? { id: membership.groupId, name: membership.group.name, enabled: membership.enabled, memberId: membership.id } : null
      };
    });
  }

  async partnerEligibility(cityInput: string, serviceType: LaunchServiceType) {
    const city = this.city(cityInput);
    const vendors = await this.prisma.vendor.findMany({
      include: {
        user: true, sourceApplication: { include: { documents: true } }, onboardingDocuments: true,
        products: { where: { isActive: true, isAvailable: true, deletedAt: null } },
        services: { where: { status: "ACTIVE", isAvailable: true, deletedAt: null } },
        orders: { where: { orderStatus: { notIn: ["COMPLETED", "CANCELLED", "FAILED"] } }, select: { id: true } }
      }
    });
    const memberships = await this.prisma.controlledSupplyMember.findMany({ where: { vendorId: { in: vendors.map((vendor) => vendor.id) }, group: { cityCode: city.code, serviceType } }, include: { group: true } });
    const requiredTypes = this.requiredMemberTypes(serviceType, UserRole.VENDOR);
    return vendors.map((vendor) => {
      const documents = [...vendor.onboardingDocuments, ...(vendor.sourceApplication?.documents ?? [])];
      const membership = memberships.find((item) => item.vendorId === vendor.id && requiredTypes.includes(item.memberType) && item.group.status === ControlledSupplyGroupStatus.ACTIVE && this.activeWindow(item.group));
      const productCapability = vendor.products.length > 0;
      const serviceCapability = vendor.services.length > 0;
      let cityMatches = false;
      try { cityMatches = this.city(vendor.city).code === city.code; } catch { cityMatches = false; }
      const capability = productCapability && serviceCapability ? "BOTH" : serviceCapability ? "SERVICE_PROVIDER" : "PRODUCT_SELLER";
      const blockers: string[] = [];
      if (vendor.user.accountStatus === AccountStatus.SUSPENDED || vendor.status === VendorStatus.SUSPENDED) blockers.push("SUSPENDED");
      if (vendor.deletedAt) blockers.push("TRASHED");
      if (vendor.status !== VendorStatus.ACTIVE || vendor.user.accountStatus !== AccountStatus.ACTIVE) blockers.push("PROFILE_INACTIVE");
      if (vendor.sourceApplication?.status !== VendorApplicationStatus.APPROVED) blockers.push("APPLICATION_NOT_APPROVED");
      if (!this.documentsApproved(documents)) blockers.push("DOCUMENTS_NOT_APPROVED");
      if (serviceType === LaunchServiceType.SME_SERVICES && !serviceCapability) blockers.push("NO_ACTIVE_SERVICE");
      if (serviceType !== LaunchServiceType.SME_SERVICES && !productCapability) blockers.push("NO_ACTIVE_PRODUCT");
      if (!cityMatches) blockers.push("CITY_MISMATCH");
      if (!membership) blockers.push("NOT_IN_CONTROLLED_GROUP");
      else if (!membership.enabled) blockers.push("ACTIVATION_PENDING");
      return {
        userId: vendor.userId, vendorId: vendor.id, businessName: vendor.businessName, tradingName: vendor.sourceApplication?.tradingName,
        capability, city: vendor.city, onlineState: vendor.isOpen ? "ONLINE" : "OFFLINE", activeProductCount: vendor.products.length,
        activeServiceCount: vendor.services.length, openOrderCount: vendor.orders.length, documentStatus: this.documentsApproved(documents) ? "APPROVED" : "INCOMPLETE",
        eligibility: blockers[0] ?? "ELIGIBLE", blockers: [...new Set(blockers)], controlledGroup: membership ? { id: membership.groupId, name: membership.group.name, enabled: membership.enabled, memberId: membership.id } : null
      };
    });
  }

  async customers(cityInput?: string) {
    const cityCode = cityInput ? this.city(cityInput).code : undefined;
    return this.prisma.controlledOperationsCustomer.findMany({ where: cityCode ? { cityCode } : undefined, orderBy: [{ cityCode: "asc" }, { createdAt: "desc" }] });
  }

  async addCustomer(adminUserId: string, dto: AddControlledOperationsCustomerDto) {
    const city = this.city(dto.city);
    const user = await this.prisma.user.findFirst({ where: { id: dto.userId, role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null }, include: { customerProfile: true } });
    if (!user?.customerProfile) throw new BadRequestException("Controlled Customer must be an existing active Customer account");
    const customer = await this.prisma.controlledOperationsCustomer.upsert({ where: { userId: user.id }, create: { cityCode: city.code, customerProfileId: user.customerProfile.id, userId: user.id, label: dto.label.trim(), internalNote: dto.internalNote?.trim(), addedByAdminId: adminUserId }, update: { cityCode: city.code, customerProfileId: user.customerProfile.id, label: dto.label.trim(), internalNote: dto.internalNote?.trim(), enabled: false, deactivatedAt: new Date(), addedByAdminId: adminUserId } });
    await this.audit.record(adminUserId, "admin.production_launch.controlled_customer_added", "ControlledOperationsCustomer", customer.id, { cityCode: city.code, excludedFromCampaigns: true });
    return customer;
  }

  async updateCustomer(id: string, adminUserId: string, dto: UpdateControlledOperationsCustomerDto) {
    const customer = await this.prisma.controlledOperationsCustomer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException("Controlled Operations Customer not found");
    const updated = await this.prisma.controlledOperationsCustomer.update({ where: { id }, data: { enabled: dto.enabled, activatedAt: dto.enabled ? new Date() : customer.activatedAt, deactivatedAt: dto.enabled ? null : new Date() } });
    await this.audit.record(adminUserId, dto.enabled ? "admin.production_launch.controlled_customer_activated" : "admin.production_launch.controlled_customer_deactivated", "ControlledOperationsCustomer", id, { cityCode: customer.cityCode, reason: dto.reason.trim() });
    return updated;
  }

  async accountEligible(cityInput: string, serviceType: LaunchServiceType, userId: string, role: UserRole) {
    const city = this.city(cityInput);
    if (role === UserRole.ADMIN) return true;
    if (role === UserRole.CUSTOMER) return Boolean(await this.prisma.controlledOperationsCustomer.findFirst({ where: { cityCode: city.code, userId, enabled: true, excludedFromCampaigns: true } }));
    const now = new Date();
    const memberTypes = this.requiredMemberTypes(serviceType, role);
    if (role === UserRole.RIDER) return Boolean(await this.prisma.controlledSupplyMember.findFirst({ where: { captainUserId: userId, enabled: true, memberType: { in: memberTypes }, group: { cityCode: city.code, serviceType, status: ControlledSupplyGroupStatus.ACTIVE, OR: [{ startAt: null }, { startAt: { lte: now } }], AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }] } } }));
    if (role === UserRole.VENDOR) {
      const vendor = await this.prisma.vendor.findUnique({ where: { userId }, select: { id: true } });
      if (!vendor) return false;
      return Boolean(await this.prisma.controlledSupplyMember.findFirst({ where: { vendorId: vendor.id, enabled: true, memberType: { in: memberTypes }, group: { cityCode: city.code, serviceType, status: ControlledSupplyGroupStatus.ACTIVE, OR: [{ startAt: null }, { startAt: { lte: now } }], AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }] } } }));
    }
    return false;
  }

  private async ensureChecklist(cityCode: string, serviceType: LaunchServiceType) {
    await this.prisma.$transaction(OPERATIONS_CHECKS.map(([key, label]) => this.prisma.launchOperationsChecklistItem.upsert({ where: { cityCode_serviceType_key: { cityCode, serviceType, key } }, create: { cityCode, serviceType, key, label }, update: { label } })));
  }

  async checklist(cityInput: string, serviceType: LaunchServiceType) {
    const city = this.city(cityInput);
    await this.ensureChecklist(city.code, serviceType);
    const now = new Date();
    const [items, criticalFailures] = await Promise.all([
      this.prisma.launchOperationsChecklistItem.findMany({ where: { cityCode: city.code, serviceType }, orderBy: { createdAt: "asc" } }),
      this.prisma.launchDrill.count({ where: { cityCode: city.code, serviceType, criticalFailure: true, result: { in: [LaunchDrillResult.FAILED, LaunchDrillResult.BLOCKED] } } })
    ]);
    const mandatoryItems = items.filter((item) => item.mandatory);
    const satisfied = mandatoryItems.filter((item) => item.status === LaunchChecklistItemStatus.COMPLETE || (item.status === LaunchChecklistItemStatus.WAIVED && item.waiverExpiresAt && item.waiverExpiresAt > now)).length;
    return { city, serviceType, items, criticalFailures, canEnableOperationsOnly: satisfied === mandatoryItems.length && criticalFailures === 0, score: { satisfied, total: mandatoryItems.length } };
  }

  async updateChecklist(cityInput: string, serviceType: LaunchServiceType, itemId: string, adminUserId: string, dto: UpdateOperationsChecklistItemDto) {
    const city = this.city(cityInput);
    const item = await this.prisma.launchOperationsChecklistItem.findFirst({ where: { id: itemId, cityCode: city.code, serviceType } });
    if (!item) throw new NotFoundException("Operations-only checklist item not found");
    if (dto.status === LaunchChecklistItemStatus.WAIVED && (!dto.waiverReason?.trim() || !dto.waiverExpiresAt || new Date(dto.waiverExpiresAt) <= new Date())) throw new BadRequestException("A checklist waiver requires a reason and future expiry");
    const updated = await this.prisma.launchOperationsChecklistItem.update({ where: { id: itemId }, data: { status: dto.status, note: dto.note?.trim(), waiverReason: dto.status === LaunchChecklistItemStatus.WAIVED ? dto.waiverReason?.trim() : null, waiverExpiresAt: dto.status === LaunchChecklistItemStatus.WAIVED ? new Date(dto.waiverExpiresAt!) : null, updatedByAdminId: adminUserId } });
    await this.audit.record(adminUserId, "admin.production_launch.operations_checklist_changed", "LaunchOperationsChecklistItem", itemId, { cityCode: city.code, serviceType, previousStatus: item.status, newStatus: dto.status, waiverReason: updated.waiverReason });
    return updated;
  }

  async assertOperationsReady(cityInput: string, serviceType: LaunchServiceType) {
    const result = await this.checklist(cityInput, serviceType);
    if (!result.canEnableOperationsOnly) throw new BadRequestException(`OPERATIONS_ONLY blocked: ${result.score.satisfied}/${result.score.total} checklist items satisfied; ${result.criticalFailures} critical drill blockers`);
  }

  async readinessProjection(cityInput?: string) {
    const cities = cityInput ? [this.city(cityInput)] : [...CONTROLLED_CITIES];
    return Promise.all(cities.map(async (city) => {
      const [members, configs] = await Promise.all([
        this.prisma.controlledSupplyMember.findMany({ where: { enabled: true, group: { cityCode: city.code, status: ControlledSupplyGroupStatus.ACTIVE } }, include: { group: true } }),
        this.prisma.launchMarketConfig.findMany({ where: { cityCode: city.code }, select: { serviceType: true, minimumOnlineCaptainCount: true, minimumOnlinePartnerCount: true } })
      ]);
      const count = (types: ControlledSupplyMemberType[]) => new Set(members.filter((member) => types.includes(member.memberType)).map((member) => member.captainUserId ?? member.vendorId)).size;
      const targets = { rideCaptains: count([ControlledSupplyMemberType.RIDE_CAPTAIN, ControlledSupplyMemberType.DUAL_MODE_CAPTAIN]), deliveryCaptains: count([ControlledSupplyMemberType.DELIVERY_CAPTAIN, ControlledSupplyMemberType.DUAL_MODE_CAPTAIN]), productPartners: count([ControlledSupplyMemberType.PRODUCT_SELLER, ControlledSupplyMemberType.MIXED_PARTNER]), servicePartners: count([ControlledSupplyMemberType.SERVICE_PROVIDER, ControlledSupplyMemberType.MIXED_PARTNER]) };
      const config = (serviceType: LaunchServiceType) => configs.find((item) => item.serviceType === serviceType);
      const requiredTargets = {
        rideCaptains: config(LaunchServiceType.RIDES)?.minimumOnlineCaptainCount ?? 1,
        deliveryCaptains: config(LaunchServiceType.PARCEL_DELIVERY)?.minimumOnlineCaptainCount ?? 1,
        productPartners: config(LaunchServiceType.MARKETPLACE)?.minimumOnlinePartnerCount ?? 1,
        servicePartners: config(LaunchServiceType.SME_SERVICES)?.minimumOnlinePartnerCount ?? 1
      };
      const drillReady = Object.entries(targets).every(([key, value]) => value >= requiredTargets[key as keyof typeof requiredTargets]);
      return { city, targets, requiredTargets, drillReady, inviteRolloutReady: false, limitedPublicReady: false, recommendation: drillReady ? "DRILL_READY_OWNER_CONFIRMATION_REQUIRED" : "NOT_READY — SUPPLY_REQUIRED" };
    }));
  }

  async monitor(cityInput?: string) {
    const cities = cityInput ? [this.city(cityInput)] : [...CONTROLLED_CITIES];
    return Promise.all(cities.map(async (city) => {
      const [rideCaptains, deliveryCaptains, productPartners, servicePartners] = await Promise.all([
        this.captainEligibility(city.name, LaunchServiceType.RIDES),
        this.captainEligibility(city.name, LaunchServiceType.PARCEL_DELIVERY),
        this.partnerEligibility(city.name, LaunchServiceType.MARKETPLACE),
        this.partnerEligibility(city.name, LaunchServiceType.SME_SERVICES)
      ]);
      const captains = [...new Map([...rideCaptains, ...deliveryCaptains].map((item) => [item.userId, item])).values()].filter((item) => !item.blockers.includes("CITY_MISMATCH"));
      const partners = [...new Map([...productPartners, ...servicePartners].map((item) => [item.vendorId, item])).values()].filter((item) => !item.blockers.includes("CITY_MISMATCH"));
      return { city, refreshedAt: new Date().toISOString(), captains: { approved: captains.filter((item) => !item.blockers.includes("APPLICATION_NOT_APPROVED")).length, controlled: captains.filter((item) => item.controlledGroup?.enabled).length, online: captains.filter((item) => item.onlineState === "ONLINE").length, available: captains.filter((item) => item.eligibility === "ELIGIBLE").length, busy: captains.filter((item) => item.blockers.includes("ACTIVE_ASSIGNMENT")).length, offline: captains.filter((item) => item.onlineState === "OFFLINE").length, locationStale: captains.filter((item) => item.blockers.includes("LOCATION_STALE")).length, suspended: captains.filter((item) => item.blockers.includes("SUSPENDED")).length, activeRide: captains.filter((item) => item.activeRide).length, activeDelivery: captains.filter((item) => item.activeDelivery).length, items: captains }, partners: { approved: partners.filter((item) => !item.blockers.includes("APPLICATION_NOT_APPROVED")).length, controlled: partners.filter((item) => item.controlledGroup?.enabled).length, online: partners.filter((item) => item.onlineState === "ONLINE").length, offline: partners.filter((item) => item.onlineState === "OFFLINE").length, productSellers: partners.filter((item) => item.capability === "PRODUCT_SELLER").length, serviceProviders: partners.filter((item) => item.capability === "SERVICE_PROVIDER").length, both: partners.filter((item) => item.capability === "BOTH").length, activeProducts: partners.reduce((sum, item) => sum + item.activeProductCount, 0), activeServices: partners.reduce((sum, item) => sum + item.activeServiceCount, 0), openOrders: partners.reduce((sum, item) => sum + item.openOrderCount, 0), items: partners } };
    }));
  }

  auditHistory() {
    return this.prisma.adminAuditLog.findMany({ where: { action: { startsWith: "admin.production_launch.controlled_" } }, orderBy: { createdAt: "desc" }, take: 250 });
  }
}
