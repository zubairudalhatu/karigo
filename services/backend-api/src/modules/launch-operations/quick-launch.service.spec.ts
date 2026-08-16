import { BadRequestException } from "@nestjs/common";
import {
  AccountStatus,
  ControlledSupplyGroupStatus,
  ControlledSupplyMemberType,
  LaunchChecklistItemStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchServiceType,
  LaunchStage,
  UserRole
} from "@prisma/client";
import { QuickLaunchService } from "./quick-launch.service";

describe("QuickLaunchService", () => {
  const config = {
    id: "config-1",
    cityCode: "KANO",
    cityName: "Kano",
    serviceType: LaunchServiceType.RIDES,
    launchStage: LaunchStage.OFF,
    isEnabled: false,
    activeFrom: null,
    activeUntil: null,
    operatingHours: { weekly: { mon: { open: "08:00", close: "18:00" } } },
    timezone: "Africa/Lagos",
    allowedZoneIds: ["kano-central"],
    inviteCohortId: null,
    maxConcurrentRequests: null,
    maxUnassignedRequests: null,
    minimumOnlineCaptainCount: 1,
    minimumOnlinePartnerCount: null,
    assignmentTimeoutMinutes: 10,
    captainLocationFreshMinutes: 15,
    customerMessage: null,
    closedMessage: null,
    internalNote: null,
    pausedReason: null,
    emergencyClosed: false,
    updatedByAdminId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const checklistItems = [
    { id: "manual", key: "backend_healthy", label: "Backend healthy", mandatory: true, status: LaunchChecklistItemStatus.COMPLETE, waiverExpiresAt: null },
    { id: "customer", key: "controlled_customer_ready", label: "Controlled Customer account ready", mandatory: true, status: LaunchChecklistItemStatus.COMPLETE, waiverExpiresAt: null },
    { id: "group", key: "controlled_group_configured", label: "Controlled group configured", mandatory: true, status: LaunchChecklistItemStatus.COMPLETE, waiverExpiresAt: null },
    { id: "capacity", key: "capacity_limits_configured", label: "Capacity configured", mandatory: true, status: LaunchChecklistItemStatus.COMPLETE, waiverExpiresAt: null }
  ];
  const prisma: any = {
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    controlledSupplyGroup: { findFirst: jest.fn() },
    controlledOperationsCustomer: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn() },
    launchDrill: { findUnique: jest.fn() }
  };
  const controlled: any = {
    captainEligibility: jest.fn(),
    partnerEligibility: jest.fn(),
    checklist: jest.fn(),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    addCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    updateChecklist: jest.fn()
  };
  const launch: any = {
    configs: jest.fn(),
    updateConfig: jest.fn(),
    createDrill: jest.fn(),
    updateDrill: jest.fn()
  };
  const service = new QuickLaunchService(prisma, controlled, launch);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([{
      id: "customer-1", fullName: "KariGO Operations", phoneNumber: "+2348000000001", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, customerProfile: { referralCode: "KGO-CUST-1" },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);
    prisma.user.findFirst.mockResolvedValue({
      id: "customer-1", fullName: "KariGO Operations", phoneNumber: "+2348000000001", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, customerProfile: { referralCode: "KGO-CUST-1" },
      addresses: [{ city: "Kano", state: "Kano" }]
    });
    controlled.captainEligibility.mockResolvedValue([{
      userId: "captain-1", captainName: "Ready Captain", phoneNumber: "+2348000000002", captainCode: "KGO-CAP-1",
      blockers: ["NOT_IN_CONTROLLED_GROUP"], city: "Kano"
    }]);
    controlled.partnerEligibility.mockResolvedValue([{
      userId: "partner-user", vendorId: "partner-1", businessName: "Ready Partner", phoneNumber: "+2348000000003", partnerCode: "KGO-PAR-1",
      blockers: ["ACTIVATION_PENDING"], city: "Kano"
    }]);
    controlled.checklist.mockResolvedValue({ items: checklistItems, criticalFailures: 0 });
    prisma.controlledSupplyGroup.findFirst.mockResolvedValue({
      id: "group-1", name: "Kano Ride controlled", cityCode: "KANO", serviceType: LaunchServiceType.RIDES,
      status: ControlledSupplyGroupStatus.ACTIVE, maximumMembers: 4,
      members: [{ id: "member-1", captainUserId: "captain-1", vendorId: null, memberType: ControlledSupplyMemberType.RIDE_CAPTAIN, enabled: false }]
    });
    prisma.controlledOperationsCustomer.findUnique.mockResolvedValue({ id: "controlled-customer-1", userId: "customer-1", cityCode: "KANO", label: "KariGO Operations", enabled: true });
    prisma.vendor.findUnique.mockResolvedValue({ userId: "partner-user" });
    launch.configs.mockResolvedValue([config]);
    launch.updateConfig.mockImplementation(async (_city: string, _service: LaunchServiceType, _admin: string, payload: any) => ({ ...config, launchStage: payload.launchStage, isEnabled: payload.isEnabled, maxConcurrentRequests: payload.maxConcurrentRequests, maxUnassignedRequests: payload.maxUnassignedRequests }));
    launch.createDrill.mockResolvedValue({ id: "drill-1" });
    launch.updateDrill.mockResolvedValue({ id: "drill-1", result: LaunchDrillResult.IN_PROGRESS, steps: [] });
  });

  it("searches Customers by operational identity and resolves service-area readiness", async () => {
    const result = await service.customerCandidates("Kano", "KGO-CUST-1");

    expect(result[0]).toMatchObject({ name: "KariGO Operations", phoneNumber: "+2348000000001", customerCode: "KGO-CUST-1", capabilityLabel: "Customer", statusLabel: "Customer account active", cityReadiness: "Ready for Kano", ready: true });
    const query = prisma.user.findMany.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({ where: expect.objectContaining({ deletedAt: null, customerProfile: { isNot: null }, OR: expect.any(Array) }), take: 50 }));
    expect(query.where).not.toHaveProperty("role");
  });

  it("matches a stored canonical Customer phone when Operations enters local form", async () => {
    await expect(service.customerCandidates("Kano", "08000000001")).resolves.toHaveLength(1);
    const phoneConditions = prisma.user.findMany.mock.calls[0][0].where.OR.filter((item: any) => item.phoneNumber);
    expect(phoneConditions).toContainEqual({ phoneNumber: { contains: "8000000001" } });
  });

  it("matches a stored local Customer phone when Operations enters canonical form", async () => {
    prisma.user.findMany.mockResolvedValueOnce([{
      id: "customer-local", fullName: "Local Customer", phoneNumber: "08033686696", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-LOCAL" },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);
    const result = await service.customerCandidates("Kano", "+2348033686696");
    expect(result[0]).toMatchObject({ phoneNumber: "08033686696", ready: true });
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toContainEqual({ phoneNumber: { contains: "8033686696" } });
  });

  it.each([UserRole.RIDER, UserRole.VENDOR])("keeps Customer capability selectable for a unified %s-base account", async (role) => {
    prisma.user.findMany.mockResolvedValueOnce([{
      id: `unified-${role}`, fullName: `Unified ${role}`, phoneNumber: "+2348033686696", role,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: `KGO-${role}` },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);
    const result = await service.customerCandidates("Kano", "Unified");
    expect(result[0]).toMatchObject({ capabilityLabel: "Customer", ready: true });
    expect(prisma.user.findMany.mock.calls[0][0].where).not.toHaveProperty("role");
  });

  it("shows suspended Customers as blocked and excludes deleted accounts defensively", async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: "suspended", fullName: "Suspended Customer", phoneNumber: "08033686696", role: UserRole.CUSTOMER, accountStatus: AccountStatus.SUSPENDED, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-SUSPENDED" }, addresses: [{ city: "Kano", state: "Kano" }] },
      { id: "deleted", fullName: "Deleted Customer", phoneNumber: "08033686697", role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: new Date(), customerProfile: { referralCode: "KGO-DELETED" }, addresses: [{ city: "Kano", state: "Kano" }] }
    ]);
    const result = await service.customerCandidates("Kano", "Customer");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ userId: "suspended", ready: false, blockerMessages: ["Customer account inactive"] });
    expect(prisma.user.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });

  it("returns an Abuja-mismatched Customer with a safe city blocker", async () => {
    const result = await service.customerCandidates("Abuja", "KariGO Operations");
    expect(result[0]).toMatchObject({ ready: false, cityReadiness: "No Abuja service-area address", blockerMessages: ["Customer has no address in the selected service area"] });
  });

  it("turns setup-only Captain blockers into READY while keeping operational blockers visible", async () => {
    const ready = await service.captainCandidates("Kano", LaunchServiceType.RIDES, "Ready");
    expect(ready[0]).toMatchObject({ ready: true, blockerMessages: [] });
    expect(ready[0]).not.toHaveProperty("blockers");
    expect(ready[0]).not.toHaveProperty("eligibility");

    controlled.captainEligibility.mockResolvedValueOnce([{ userId: "captain-2", captainName: "Stale Captain", phoneNumber: "0802", blockers: ["LOCATION_STALE"] }]);
    const blocked = await service.captainCandidates("Kano", LaunchServiceType.RIDES);
    expect(blocked[0]).toMatchObject({ ready: false, blockerMessages: ["Refresh Captain GPS"] });
  });

  it.each([
    ["08033686696", "+2348033686696"],
    ["+2348033686696", "08033686696"],
    ["8033686696", "+2348033686696"]
  ])("matches Captain phone query %s against stored %s", async (query, stored) => {
    controlled.captainEligibility.mockResolvedValueOnce([{ userId: "captain-phone", captainName: "Phone Captain", phoneNumber: stored, captainCode: "KGO-CAP-PHONE", blockers: ["NOT_IN_CONTROLLED_GROUP"], city: "Kano" }]);
    const result = await service.captainCandidates("Kano", LaunchServiceType.RIDES, query);
    expect(result[0]).toMatchObject({ phoneNumber: stored, capabilityLabel: "Ride Captain", ready: true });
  });

  it.each([
    ["08033686696", "+2348033686696"],
    ["+2348033686696", "08033686696"],
    ["8033686696", "2348033686696"]
  ])("matches Partner phone query %s against stored %s", async (query, stored) => {
    controlled.partnerEligibility.mockResolvedValueOnce([{ userId: "partner-user", vendorId: "partner-phone", businessName: "Phone Partner", phoneNumber: stored, partnerCode: "KGO-PAR-PHONE", capability: "BOTH", blockers: ["NOT_IN_CONTROLLED_GROUP"], city: "Kano" }]);
    const result = await service.partnerCandidates("Kano", LaunchServiceType.MARKETPLACE, query);
    expect(result[0]).toMatchObject({ phoneNumber: stored, capabilityLabel: "Product Seller and Service Provider", ready: true });
  });

  it("returns an empty collection when no account matches", async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    await expect(service.customerCandidates("Kano", "Nobody Here")).resolves.toEqual([]);
  });

  it("rejects a delivery/order test when its Partner has not been selected", async () => {
    await expect(service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.MARKETPLACE, customerUserId: "customer-1", captainUserId: "captain-1",
      reason: "Controlled order verification", confirmed: true
    })).rejects.toThrow("Select a ready Partner for this service");
  });

  it("starts a confirmed Ride test with reused records, preserved hours, 1/1 capacity and OPERATIONS_ONLY", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "customer-1", fullName: "KariGO Operations", phoneNumber: "+2348000000001", role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-CUST-1" }, addresses: [{ city: "Kano", state: "Kano" }]
    });
    const result = await service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.RIDES, customerUserId: "customer-1", captainUserId: "captain-1",
      reason: "Owner-approved first Kano Ride test", confirmed: true
    });

    expect(controlled.updateMember).toHaveBeenCalledWith("group-1", "member-1", "admin-1", { enabled: true, reason: "Owner-approved first Kano Ride test" });
    expect(launch.updateConfig).toHaveBeenNthCalledWith(1, "Kano", LaunchServiceType.RIDES, "admin-1", expect.objectContaining({ launchStage: LaunchStage.OFF, isEnabled: false, operatingHours: config.operatingHours, maxConcurrentRequests: 1, maxUnassignedRequests: 1 }));
    expect(launch.updateConfig).toHaveBeenNthCalledWith(2, "Kano", LaunchServiceType.RIDES, "admin-1", expect.objectContaining({ launchStage: LaunchStage.OPERATIONS_ONLY, isEnabled: true, operatingHours: config.operatingHours, maxConcurrentRequests: 1, maxUnassignedRequests: 1 }));
    expect(launch.createDrill).toHaveBeenCalledWith("admin-1", expect.objectContaining({ controlledCustomerId: "controlled-customer-1", controlledSupplyGroupId: "group-1", captainUserId: "captain-1" }));
    expect(prisma.user.findFirst.mock.calls[0][0].where).not.toHaveProperty("role");
    expect(result.drill).toMatchObject({ result: LaunchDrillResult.IN_PROGRESS });
  });

  it("requires advanced controls to return a public stage OFF before Quick Launch", async () => {
    launch.configs.mockResolvedValue([{ ...config, launchStage: LaunchStage.LIMITED_PUBLIC, isEnabled: true }]);

    await expect(service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.RIDES, customerUserId: "customer-1", captainUserId: "captain-1",
      reason: "Controlled Ride verification", confirmed: true
    })).rejects.toThrow("Return Kano RIDES to OFF in Advanced Controls before using Quick Launch");
    expect(launch.updateConfig).not.toHaveBeenCalled();
  });

  it("blocks PASS until every guided step is passed", async () => {
    prisma.launchDrill.findUnique.mockResolvedValue({ id: "drill-1", cityCode: "KANO", serviceType: LaunchServiceType.RIDES, steps: [{ status: LaunchDrillStepStatus.PENDING }] });

    await expect(service.finish("drill-1", "admin-1", { outcome: "PASSED", returnServiceOff: true, reason: "Evidence reviewed", confirmed: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(launch.updateConfig).not.toHaveBeenCalled();
  });

  it("returns a stopped test OFF without deleting controlled records", async () => {
    prisma.launchDrill.findUnique.mockResolvedValue({ id: "drill-1", cityCode: "KANO", serviceType: LaunchServiceType.RIDES, steps: [{ status: LaunchDrillStepStatus.FAILED }] });
    launch.updateDrill.mockResolvedValueOnce({ id: "drill-1", result: LaunchDrillResult.FAILED });

    const result = await service.finish("drill-1", "admin-1", { outcome: "STOPPED", returnServiceOff: true, reason: "Captain GPS became stale", confirmed: true });

    expect(launch.updateConfig).toHaveBeenCalledWith("KANO", LaunchServiceType.RIDES, "admin-1", expect.objectContaining({ launchStage: LaunchStage.OFF, isEnabled: false }));
    expect(result).toMatchObject({ serviceReturnedOff: true, activeTransactionsPreserved: true });
    expect(controlled.updateMember).not.toHaveBeenCalled();
  });
});
