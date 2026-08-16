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

    expect(result[0]).toMatchObject({ name: "KariGO Operations", phoneNumber: "+2348000000001", customerCode: "KGO-CUST-1", ready: true });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: UserRole.CUSTOMER, OR: expect.any(Array) }), take: 50 }));
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

  it("rejects a delivery/order test when its Partner has not been selected", async () => {
    await expect(service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.MARKETPLACE, customerUserId: "customer-1", captainUserId: "captain-1",
      reason: "Controlled order verification", confirmed: true
    })).rejects.toThrow("Select a ready Partner for this service");
  });

  it("starts a confirmed Ride test with reused records, preserved hours, 1/1 capacity and OPERATIONS_ONLY", async () => {
    const result = await service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.RIDES, customerUserId: "customer-1", captainUserId: "captain-1",
      reason: "Owner-approved first Kano Ride test", confirmed: true
    });

    expect(controlled.updateMember).toHaveBeenCalledWith("group-1", "member-1", "admin-1", { enabled: true, reason: "Owner-approved first Kano Ride test" });
    expect(launch.updateConfig).toHaveBeenNthCalledWith(1, "Kano", LaunchServiceType.RIDES, "admin-1", expect.objectContaining({ launchStage: LaunchStage.OFF, isEnabled: false, operatingHours: config.operatingHours, maxConcurrentRequests: 1, maxUnassignedRequests: 1 }));
    expect(launch.updateConfig).toHaveBeenNthCalledWith(2, "Kano", LaunchServiceType.RIDES, "admin-1", expect.objectContaining({ launchStage: LaunchStage.OPERATIONS_ONLY, isEnabled: true, operatingHours: config.operatingHours, maxConcurrentRequests: 1, maxUnassignedRequests: 1 }));
    expect(launch.createDrill).toHaveBeenCalledWith("admin-1", expect.objectContaining({ controlledCustomerId: "controlled-customer-1", controlledSupplyGroupId: "group-1", captainUserId: "captain-1" }));
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
