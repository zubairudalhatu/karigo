import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  LaunchCohortMemberStatus,
  LaunchDrillResult,
  LaunchDrillStepStatus,
  LaunchDrillType,
  LaunchIncidentSeverity,
  LaunchReadinessStatus,
  LaunchServiceType,
  LaunchStage,
  UserRole
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LaunchOperationsService } from "./launch-operations.service";

describe("LaunchOperationsService", () => {
  const prisma: any = {
    launchMarketConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    launchCohortMember: { findFirst: jest.fn() },
    launchCapacityDenial: { create: jest.fn() },
    launchMarketConfigHistory: { create: jest.fn() },
    launchReadinessItem: { upsert: jest.fn(), findMany: jest.fn() },
    launchIncident: { create: jest.fn() },
    launchDrill: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    launchDrillStep: { findFirst: jest.fn(), update: jest.fn() },
    launchDrillEvent: { create: jest.fn() },
    controlledOperationsCustomer: { findFirst: jest.fn(), findUnique: jest.fn() },
    controlledSupplyGroup: { findFirst: jest.fn() },
    supportTicket: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    taxiDriverProfile: { findMany: jest.fn() },
    taxiTrip: { count: jest.fn() },
    $transaction: jest.fn(async (callback: any) => typeof callback === "function" ? callback(prisma) : Promise.all(callback))
  };
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };
  const audit = { record: jest.fn() };
  const controlledSupply = { accountEligible: jest.fn(), captainEligibility: jest.fn(), assertOperationsReady: jest.fn() };
  const service = new LaunchOperationsService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    audit as unknown as AdminAuditService,
    controlledSupply as never
  );

  const baseConfig = {
    id: "config-id",
    cityCode: "KANO",
    cityName: "Kano",
    serviceType: LaunchServiceType.RIDES,
    launchStage: LaunchStage.LIMITED_PUBLIC,
    isEnabled: true,
    activeFrom: null,
    activeUntil: null,
    operatingHours: null,
    timezone: "Africa/Lagos",
    allowedZoneIds: null,
    inviteCohortId: null,
    maxConcurrentRequests: null,
    maxUnassignedRequests: null,
    minimumOnlineCaptainCount: null,
    minimumOnlinePartnerCount: null,
    assignmentTimeoutMinutes: null,
    captainLocationFreshMinutes: null,
    customerMessage: null,
    closedMessage: null,
    internalNote: null,
    pausedReason: null,
    emergencyClosed: false,
    updatedByAdminId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((_key: string, fallback?: unknown) => fallback);
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    prisma.launchCohortMember.findFirst.mockResolvedValue(null);
    prisma.taxiDriverProfile.findMany.mockResolvedValue([]);
    prisma.taxiTrip.count.mockResolvedValue(0);
    prisma.launchReadinessItem.upsert.mockResolvedValue({ id: "readiness-id" });
    controlledSupply.accountEligible.mockResolvedValue(false);
    controlledSupply.captainEligibility.mockResolvedValue([]);
    controlledSupply.assertOperationsReady.mockResolvedValue(undefined);
  });

  it("fails closed when no city/service configuration exists", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue(null);
    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user", enforceCapacity: false });
    expect(result).toMatchObject({ launchStage: LaunchStage.OFF, available: false, reasonCode: "SERVICE_OFF" });
  });

  it("fails closed when the validated global launch kill switch is enabled", async () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => key === "LAUNCH_GLOBAL_KILL_SWITCH" ? true : fallback);
    prisma.launchMarketConfig.findUnique.mockResolvedValue(baseConfig);

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user", enforceCapacity: false });

    expect(result).toMatchObject({ launchStage: LaunchStage.OFF, available: false, reasonCode: "SERVICE_OFF" });
  });

  it("rejects a non-member during invite-only launch without exposing cohort details", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.INVITE_ONLY, inviteCohortId: "cohort-id" });
    const result = await service.resolveEligibility({ city: "Kano State", serviceType: LaunchServiceType.RIDES, userId: "user", enforceCapacity: false });
    expect(result).toMatchObject({ available: false, reasonCode: "INVITE_REQUIRED" });
    expect(JSON.stringify(result)).not.toContain("cohort-id");
  });

  it("allows an eligible active cohort member", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.INVITE_ONLY, inviteCohortId: "cohort-id" });
    prisma.launchCohortMember.findFirst.mockResolvedValue({ id: "member-id", status: LaunchCohortMemberStatus.ACTIVE });
    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user", enforceCapacity: false });
    expect(result.available).toBe(true);
  });

  it("allows a unified CUSTOMER-role account through verified controlled Ride Captain capability", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, cityCode: "ABUJA", cityName: "Abuja", launchStage: LaunchStage.OPERATIONS_ONLY, minimumOnlineCaptainCount: 1 });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.captainEligibility.mockResolvedValue([{
      userId: "unified-captain",
      blockers: [],
      currentGpsArea: { id: "fct-abuja", cityCode: "ABUJA", cityName: "Abuja" },
      controlledGroup: { id: "group-1", enabled: true, memberId: "member-1" }
    }]);

    const result = await service.resolveEligibility({ city: "Abuja", serviceType: LaunchServiceType.RIDES, userId: "unified-captain", actorContext: "CAPTAIN", enforceCapacity: false });

    expect(result).toMatchObject({ launchStage: LaunchStage.OPERATIONS_ONLY, available: true, reasonCode: null });
    expect(controlledSupply.captainEligibility).toHaveBeenCalledWith("Abuja", LaunchServiceType.RIDES);
    expect(prisma.taxiDriverProfile.findMany).not.toHaveBeenCalled();
  });

  it("evaluates the same unified identity as a controlled Customer in Customer context", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.accountEligible.mockResolvedValue(true);

    await expect(service.assertCustomerCanStart({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "unified-captain" })).resolves.toMatchObject({ available: true });

    expect(controlledSupply.accountEligible).toHaveBeenCalledWith("Kano", LaunchServiceType.RIDES, "unified-captain", UserRole.CUSTOMER);
    expect(controlledSupply.captainEligibility).not.toHaveBeenCalled();
  });

  it("blocks a non-controlled Captain with a precise safe reason", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, cityCode: "ABUJA", cityName: "Abuja", launchStage: LaunchStage.OPERATIONS_ONLY });
    controlledSupply.captainEligibility.mockResolvedValue([{
      userId: "captain-user",
      blockers: ["NOT_IN_CONTROLLED_GROUP"],
      currentGpsArea: { id: "fct-abuja" },
      controlledGroup: null
    }]);

    const result = await service.resolveEligibility({ city: "Abuja", serviceType: LaunchServiceType.RIDES, userId: "captain-user", actorContext: "CAPTAIN", enforceCapacity: false });

    expect(result).toMatchObject({ available: false, reasonCode: "CONTROLLED_ACCESS_NOT_ENABLED", message: "Controlled Captain access is not enabled for this city and service." });
  });

  it.each([LaunchStage.INVITE_ONLY, LaunchStage.LIMITED_PUBLIC, LaunchStage.CITY_WIDE])("preserves %s Captain availability without controlled-membership gating", async (launchStage) => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, cityCode: "ABUJA", cityName: "Abuja", launchStage });
    controlledSupply.captainEligibility.mockResolvedValue([{
      userId: "captain-user",
      blockers: ["NOT_IN_CONTROLLED_GROUP"],
      currentGpsArea: { id: "fct-abuja" },
      controlledGroup: null
    }]);

    const result = await service.resolveEligibility({ city: "Abuja", serviceType: LaunchServiceType.RIDES, userId: "captain-user", actorContext: "CAPTAIN", enforceCapacity: false });

    expect(result.available).toBe(true);
    expect(prisma.launchCohortMember.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    [LaunchStage.OFF, false, "SERVICE_OFF"],
    [LaunchStage.PAUSED, false, "SERVICE_PAUSED"]
  ])("blocks Captain availability when stage is %s", async (launchStage, isEnabled, reasonCode) => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage, isEnabled });

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "captain-user", actorContext: "CAPTAIN", enforceCapacity: false });

    expect(result).toMatchObject({ available: false, reasonCode });
    expect(controlledSupply.captainEligibility).not.toHaveBeenCalled();
  });

  it("allows only a controlled Captain during operations-only access", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.RIDER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.accountEligible.mockResolvedValue(true);

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "captain-user", enforceCapacity: false });

    expect(result.available).toBe(true);
  });

  it("uses Customer capability for a unified account when starting controlled Customer work", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.RIDER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.accountEligible.mockResolvedValue(true);

    await expect(service.assertCustomerCanStart({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "unified-customer" })).resolves.toMatchObject({ available: true });
    expect(controlledSupply.accountEligible).toHaveBeenCalledWith("Kano", LaunchServiceType.RIDES, "unified-customer", UserRole.CUSTOMER);
  });

  it("rejects a non-controlled Customer during operations-only access", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "customer-user", enforceCapacity: false });

    expect(result).toMatchObject({ available: false, reasonCode: "OPERATIONS_ONLY" });
  });

  it("rejects non-controlled supply from receiving new operations-only work", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.VENDOR, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.accountEligible.mockResolvedValue(false);

    await expect(service.assertControlledSupplyCanReceive({
      city: "Kano",
      serviceType: LaunchServiceType.MARKETPLACE,
      userId: "partner-user",
      participant: "Partner"
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("uses Captain capability instead of a unified account's base role at the assignment boundary", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.OPERATIONS_ONLY });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE, deletedAt: null });
    controlledSupply.accountEligible.mockResolvedValue(true);

    await expect(service.assertControlledSupplyCanReceive({
      city: "Kano",
      serviceType: LaunchServiceType.RIDES,
      userId: "unified-captain",
      participant: "Captain"
    })).resolves.toBeUndefined();

    expect(controlledSupply.accountEligible).toHaveBeenCalledWith(
      "Kano", LaunchServiceType.RIDES, "unified-captain", UserRole.RIDER
    );
  });

  it("enforces configured operating hours", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, operatingHours: { weekly: { mon: { closed: true }, tue: { closed: true }, wed: { closed: true }, thu: { closed: true }, fri: { closed: true }, sat: { closed: true }, sun: { closed: true } } } });
    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user", enforceCapacity: false });
    expect(result).toMatchObject({ available: false, reasonCode: "OUTSIDE_OPERATING_HOURS" });
  });

  it("blocks new activity while preserving the service-specific safe response", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, launchStage: LaunchStage.PAUSED, isEnabled: false });
    await expect(service.assertCustomerCanStart({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user" })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.launchMarketConfig.upsert).not.toHaveBeenCalled();
  });

  it("requires second confirmation for a city-wide activation", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue(baseConfig);
    await expect(service.updateConfig("Kano", LaunchServiceType.RIDES, "admin-id", {
      launchStage: LaunchStage.CITY_WIDE,
      isEnabled: true,
      reason: "Operations approval recorded",
      confirmed: true,
      highImpactConfirmed: false
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records a confirmed pause in configuration history and the Admin audit log", async () => {
    const paused = { ...baseConfig, launchStage: LaunchStage.PAUSED, isEnabled: false, pausedReason: "Capacity incident" };
    prisma.launchMarketConfig.findUnique.mockResolvedValue(baseConfig);
    prisma.launchMarketConfig.upsert.mockResolvedValue(paused);

    await service.updateConfig("Kano", LaunchServiceType.RIDES, "admin-id", {
      launchStage: LaunchStage.PAUSED,
      isEnabled: false,
      reason: "Capacity incident",
      pausedReason: "Capacity incident",
      confirmed: true,
      highImpactConfirmed: true
    });

    expect(prisma.launchMarketConfigHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousStage: LaunchStage.LIMITED_PUBLIC, newStage: LaunchStage.PAUSED, adminUserId: "admin-id" }) });
    expect(audit.record).toHaveBeenCalledWith("admin-id", "admin.production_launch.config_changed", "LaunchMarketConfig", baseConfig.id, expect.objectContaining({ newStage: LaunchStage.PAUSED }));
  });

  it("calculates readiness using ready items and unexpired waivers", async () => {
    prisma.launchReadinessItem.findMany.mockResolvedValue([
      ...Array.from({ length: 8 }, (_, index) => ({ id: `ready-${index}`, status: LaunchReadinessStatus.READY, waiverExpiresAt: null })),
      { id: "waived", status: LaunchReadinessStatus.WAIVED, waiverExpiresAt: new Date(Date.now() + 86_400_000) },
      { id: "risk", status: LaunchReadinessStatus.AT_RISK, waiverExpiresAt: null }
    ]);

    const result = await service.readiness("Abuja");

    expect(result.score).toEqual({ ready: 9, total: 10, percentage: 90 });
    expect(result.finalDecisionRequired).toBe(true);
  });

  it("creates an incident record without changing a launch stage", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ id: baseConfig.id });
    prisma.launchIncident.create.mockResolvedValue({ id: "incident-id", reference: "KGO-INC-SAFE" });

    await service.createIncident("admin-id", {
      city: "Kano",
      serviceType: LaunchServiceType.RIDES,
      severity: LaunchIncidentSeverity.SEV2,
      summary: "Ride assignment degradation"
    });

    expect(prisma.launchIncident.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cityCode: "KANO", serviceType: LaunchServiceType.RIDES, openedByAdminId: "admin-id" }) });
    expect(prisma.launchMarketConfig.upsert).not.toHaveBeenCalled();
  });

  it("rejects new Ride demand when configured Captain supply is below minimum", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, minimumOnlineCaptainCount: 2 });

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user" });

    expect(result).toMatchObject({ available: false, reasonCode: "AT_CAPACITY" });
    expect(result).not.toHaveProperty("onlineCaptains");
    expect(prisma.launchCapacityDenial.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cityCode: "KANO", serviceType: LaunchServiceType.RIDES, reasonCode: "CAPTAIN_SUPPLY_BELOW_MINIMUM" })
    });
  });

  it("counts an online Kano-resident Captain in Abuja from approved current GPS area", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({
      ...baseConfig,
      cityCode: "ABUJA",
      cityName: "Abuja",
      minimumOnlineCaptainCount: 1
    });
    prisma.taxiDriverProfile.findMany.mockResolvedValue([{
      city: "Kano",
      state: "Kano",
      lastKnownLatitude: 9.0765,
      lastKnownLongitude: 7.3986,
      application: {
        operatingAreaIds: ["kano-kano", "fct-abuja"],
        primaryOperatingAreaId: "kano-kano",
        city: "Kano",
        state: "Kano"
      }
    }]);

    const result = await service.resolveEligibility({ city: "Abuja", serviceType: LaunchServiceType.RIDES, userId: "customer-user" });

    expect(result.available).toBe(true);
    expect(prisma.taxiDriverProfile.findMany.mock.calls[0][0].where).not.toHaveProperty("city");
    expect(prisma.launchCapacityDenial.create).not.toHaveBeenCalled();
  });

  it("enforces configured zone filtering without exposing the allowed zone list", async () => {
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ ...baseConfig, allowedZoneIds: ["kano-central"] });

    const result = await service.resolveEligibility({ city: "Kano", serviceType: LaunchServiceType.RIDES, userId: "user", zoneId: "kano-east", enforceCapacity: false });

    expect(result).toMatchObject({ available: false, reasonCode: "ZONE_NOT_AVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("kano-central");
  });

  it("exports daily launch metrics as a privacy-safe CSV summary", async () => {
    const reportSpy = jest.spyOn(service, "dailyReport").mockResolvedValueOnce({
      date: "2026-08-05",
      generatedAt: "2026-08-05T20:00:00.000Z",
      privacy: "Summary only",
      cities: [{
        city: "Kano", rideRequests: 4, assignedRides: 3, completedRides: 2, cancelledRides: 1,
        assignmentRate: 75, ordersCreated: 5, ordersCompleted: 4, failedOrders: 1, paymentTotal: 10000,
        refundTotal: 0, captainEarnings: 2000, partnerEarnings: 5000, pendingSettlements: 1,
        supportCases: 2, incidents: 0, capacityDenials: 1, goNoGoRecommendation: "ADMIN_DECISION_REQUIRED"
      }]
    } as never);

    const csv = await service.dailyReportCsv("2026-08-05");

    expect(csv).toContain('"Kano"');
    expect(csv).toContain('"ADMIN_DECISION_REQUIRED"');
    expect(csv).not.toContain("customerUserId");
    reportSpy.mockRestore();
  });

  it("creates a Ride drill with the guided 12-step Quick Launch checklist without starting live work", async () => {
    prisma.controlledOperationsCustomer.findFirst.mockResolvedValue({ id: "customer-record" });
    prisma.controlledSupplyGroup.findFirst.mockResolvedValue({ id: "ride-group" });
    prisma.launchDrill.create.mockImplementation(async ({ data }: any) => ({ id: "drill-1", ...data }));

    const drill = await service.createDrill("admin-id", {
      city: "Kano",
      drillType: LaunchDrillType.RIDE_END_TO_END,
      controlledCustomerId: "customer-record",
      controlledSupplyGroupId: "ride-group"
    });

    expect(prisma.launchDrill.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cityCode: "KANO",
        serviceType: LaunchServiceType.RIDES,
        steps: { create: expect.arrayContaining([expect.objectContaining({ position: 12, label: "Assignment lock released" })]) },
        events: { create: expect.objectContaining({ eventType: "CREATED" }) }
      }),
      include: expect.any(Object)
    });
    expect(drill).toBeDefined();
    expect(prisma.launchMarketConfig.upsert).not.toHaveBeenCalled();
  });

  it("records drill step pass/fail changes in the event and Admin audit histories", async () => {
    prisma.launchDrillStep.findFirst.mockResolvedValue({ id: "step-1", drillId: "drill-1", label: "Captain accepts", status: LaunchDrillStepStatus.PENDING });
    prisma.launchDrillStep.update.mockResolvedValue({ id: "step-1", status: LaunchDrillStepStatus.FAILED });

    await service.updateDrillStep("drill-1", "step-1", "admin-id", {
      status: LaunchDrillStepStatus.FAILED,
      note: "Assignment was declined"
    });

    expect(prisma.launchDrillEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ drillId: "drill-1", eventType: "STEP_CHANGED" }) });
    expect(audit.record).toHaveBeenCalledWith("admin-id", "admin.production_launch.drill_step_changed", "LaunchDrillStep", "step-1", expect.any(Object));
  });

  it("links both an incident and support ticket to a failed controlled drill", async () => {
    prisma.launchDrill.findUnique.mockResolvedValue({
      id: "drill-1",
      result: LaunchDrillResult.FAILED,
      cityCode: "KANO",
      serviceType: LaunchServiceType.RIDES,
      drillType: LaunchDrillType.RIDE_END_TO_END,
      controlledCustomerId: "customer-record",
      incidentId: null,
      supportTicketId: null,
      criticalFailure: false
    });
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ id: "config-id" });
    prisma.launchIncident.create.mockResolvedValue({ id: "incident-1", reference: "KGO-INC-1" });
    prisma.controlledOperationsCustomer.findUnique.mockResolvedValue({ id: "customer-record", customerProfileId: "customer-profile" });
    prisma.supportTicket.create.mockResolvedValue({ id: "support-1" });
    prisma.launchDrill.update.mockResolvedValue({ id: "drill-1", criticalFailure: true });

    await service.linkDrillFailure("drill-1", "admin-id", {
      action: "BOTH",
      summary: "Assignment lock did not release",
      criticalFailure: true
    });

    expect(prisma.launchIncident.create).toHaveBeenCalled();
    expect(prisma.supportTicket.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: "customer-profile", assignedAdminId: "admin-id" }) });
    expect(prisma.launchDrill.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ incidentId: "incident-1", supportTicketId: "support-1", criticalFailure: true }) }));
  });
});
