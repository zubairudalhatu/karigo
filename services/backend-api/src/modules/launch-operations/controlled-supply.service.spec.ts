import { BadRequestException } from "@nestjs/common";
import {
  AccountStatus,
  ControlledSupplyMemberType,
  DeliveryCaptainApplicationStatus,
  DocumentVerificationStatus,
  LaunchChecklistItemStatus,
  LaunchServiceType,
  RiderStatus,
  TaxiApplicationStatus,
  TaxiDriverProfileStatus,
  UserRole
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ControlledSupplyService } from "./controlled-supply.service";

describe("ControlledSupplyService", () => {
  const prisma: any = {
    controlledOperationsCustomer: { findFirst: jest.fn(), upsert: jest.fn() },
    controlledSupplyGroup: { findUnique: jest.fn() },
    controlledSupplyMember: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    launchOperationsChecklistItem: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    launchDrill: { count: jest.fn() },
    launchMarketConfig: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn(), findFirst: jest.fn() },
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations))
  };
  const audit = { record: jest.fn() };
  const service = new ControlledSupplyService(
    prisma as PrismaService,
    audit as unknown as AdminAuditService
  );

  const approvedDocument = { reviewStatus: DocumentVerificationStatus.APPROVED };
  const rideCaptain = () => ({
    id: "unified-ride-captain",
    fullName: "Unified Ride Captain",
    phoneNumber: "+2348033686696",
    role: UserRole.CUSTOMER,
    accountStatus: AccountStatus.ACTIVE,
    phoneVerified: true,
    lastLoginAt: new Date(),
    onboardingPasswordSetAt: null,
    deletedAt: null,
    rider: null,
    taxiDriverProfiles: [{
      city: "Kano",
      status: TaxiDriverProfileStatus.ACTIVE,
      lastSeenAt: new Date(),
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehiclePlateNumber: "KANO-001",
      application: {
        id: "ride-application",
        operatingAreaIds: ["kano-kano", "fct-abuja"],
        primaryOperatingAreaId: "kano-kano",
        city: "Kano",
        status: TaxiApplicationStatus.APPROVED,
        applicationReference: "KGO-RIDE-UNIFIED",
        captainDocuments: [approvedDocument]
      }
    }],
    taxiDriverApplications: [],
    deliveryCaptainApplications: [],
    captainWorkState: null
  });
  const deliveryCaptain = () => ({
    id: "unified-delivery-captain",
    fullName: "Unified Delivery Captain",
    phoneNumber: "+2348033686697",
    role: UserRole.CUSTOMER,
    accountStatus: AccountStatus.ACTIVE,
    phoneVerified: true,
    lastLoginAt: new Date(),
    onboardingPasswordSetAt: null,
    deletedAt: null,
    rider: {
      riderCode: "KGO-DELIVERY-UNIFIED", verificationStatus: RiderStatus.ACTIVE,
      vehicleType: "MOTORCYCLE", plateNumber: "KANO-002", currentLocationUpdatedAt: new Date(), documents: [approvedDocument]
    },
    taxiDriverProfiles: [],
    taxiDriverApplications: [],
    deliveryCaptainApplications: [{
      city: "Kano", status: DeliveryCaptainApplicationStatus.APPROVED, applicationReference: "KGO-DELIVERY-APP",
      captainDocuments: [approvedDocument], documents: []
    }],
    captainWorkState: { lastLocationAt: new Date(), desiredRideOnline: false, desiredDeliveryOnline: false, activeDeliveryAssignmentId: null, activeRideTripId: null }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.launchOperationsChecklistItem.upsert.mockResolvedValue({ id: "check" });
    prisma.launchDrill.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.controlledSupplyMember.findMany.mockResolvedValue([]);
    prisma.launchMarketConfig.findUnique.mockResolvedValue({ captainLocationFreshMinutes: 15 });
  });

  it("allows only an enabled city-matched controlled Operations Customer", async () => {
    prisma.controlledOperationsCustomer.findFirst
      .mockResolvedValueOnce({ id: "controlled-customer" })
      .mockResolvedValueOnce(null);

    await expect(service.accountEligible("Kano", LaunchServiceType.RIDES, "customer-1", UserRole.CUSTOMER)).resolves.toBe(true);
    await expect(service.accountEligible("Abuja", LaunchServiceType.RIDES, "customer-1", UserRole.CUSTOMER)).resolves.toBe(false);
    expect(prisma.controlledOperationsCustomer.findFirst).toHaveBeenNthCalledWith(1, {
      where: { cityCode: "KANO", userId: "customer-1", enabled: true, excludedFromCampaigns: true }
    });
  });

  it.each([UserRole.RIDER, UserRole.VENDOR])("adds an active unified %s-base account with an existing Customer profile", async (role) => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: "unified-user", role, customerProfile: { id: "customer-profile" } });
    prisma.controlledOperationsCustomer.upsert.mockResolvedValueOnce({ id: "controlled-customer", userId: "unified-user" });

    await service.addCustomer("admin-1", { city: "Kano", userId: "unified-user", label: "Unified Customer" });

    const where = prisma.user.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: "unified-user", accountStatus: "ACTIVE", deletedAt: null });
    expect(where).not.toHaveProperty("role");
    expect(prisma.controlledOperationsCustomer.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "unified-user" } }));
  });

  it("discovers an approved Ride Captain whose unified account keeps base CUSTOMER role", async () => {
    prisma.user.findMany.mockResolvedValueOnce([rideCaptain()]);

    const result = await service.captainEligibility("Kano", LaunchServiceType.RIDES);

    expect(result[0]).toMatchObject({ userId: "unified-ride-captain", city: "Kano", rideStatus: TaxiDriverProfileStatus.ACTIVE });
    expect(result[0].blockers).not.toContain("APPLICATION_NOT_APPROVED");
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("role");
    expect(where.OR).toEqual(expect.arrayContaining([
      { taxiDriverProfiles: { some: {} } },
      { taxiDriverApplications: { some: {} } }
    ]));
  });

  it("honors Abuja in approved Ride areas even when residence and primary area are Kano", async () => {
    prisma.user.findMany.mockResolvedValueOnce([rideCaptain()]);

    const result = await service.captainEligibility("Abuja", LaunchServiceType.RIDES);

    expect(result[0].blockers).not.toContain("CITY_MISMATCH");
    expect(result[0].approvedOperatingAreas).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "kano-kano", cityName: "Kano" }),
      expect.objectContaining({ id: "fct-abuja", cityName: "Abuja" })
    ]));
    expect(result[0].primaryOperatingArea).toMatchObject({ id: "kano-kano", cityName: "Kano" });
  });

  it("discovers an approved Delivery Captain whose unified account keeps base CUSTOMER role", async () => {
    prisma.user.findMany.mockResolvedValueOnce([deliveryCaptain()]);

    const result = await service.captainEligibility("Kano", LaunchServiceType.PARCEL_DELIVERY);

    expect(result[0]).toMatchObject({ userId: "unified-delivery-captain", city: "Kano", deliveryStatus: RiderStatus.ACTIVE });
    expect(result[0].blockers).not.toEqual(expect.arrayContaining(["APPLICATION_NOT_APPROVED", "PROFILE_INACTIVE", "CITY_MISMATCH"]));
  });

  it("keeps a Kano Captain discoverable under Abuja with CITY_MISMATCH", async () => {
    const captain = rideCaptain();
    captain.taxiDriverProfiles[0].application.operatingAreaIds = ["kano-kano"];
    prisma.user.findMany.mockResolvedValueOnce([captain]);

    const result = await service.captainEligibility("Abuja", LaunchServiceType.RIDES);

    expect(result[0]).toMatchObject({ userId: "unified-ride-captain", city: "Kano", eligibility: "CITY_MISMATCH" });
    expect(result[0].blockers).toContain("CITY_MISMATCH");
  });

  it("keeps a suspended unified Captain blocked", async () => {
    const captain = { ...rideCaptain(), accountStatus: AccountStatus.SUSPENDED };
    prisma.user.findMany.mockResolvedValueOnce([captain]);

    const result = await service.captainEligibility("Kano", LaunchServiceType.RIDES);

    expect(result[0].blockers).toContain("SUSPENDED");
  });

  it("keeps a unified Captain with missing documents blocked", async () => {
    const captain = rideCaptain();
    captain.taxiDriverProfiles[0].application.captainDocuments = [];
    prisma.user.findMany.mockResolvedValueOnce([captain]);

    const result = await service.captainEligibility("Kano", LaunchServiceType.RIDES);

    expect(result[0].blockers).toContain("DOCUMENTS_NOT_APPROVED");
  });

  it("keeps a unified Captain with stale GPS blocked", async () => {
    const captain = rideCaptain();
    captain.taxiDriverProfiles[0].lastSeenAt = new Date(Date.now() - 60 * 60_000);
    prisma.user.findMany.mockResolvedValueOnce([captain]);

    const result = await service.captainEligibility("Kano", LaunchServiceType.RIDES);

    expect(result[0].blockers).toContain("LOCATION_STALE");
  });

  it("adds a valid unified Captain to controlled membership without changing User.role", async () => {
    prisma.controlledSupplyGroup.findUnique.mockResolvedValue({
      id: "ride-group", cityCode: "KANO", serviceType: LaunchServiceType.RIDES, maximumMembers: 2, _count: { members: 0 }
    });
    prisma.controlledSupplyMember.findFirst.mockResolvedValue(null);
    prisma.controlledSupplyMember.create.mockResolvedValue({ id: "member-1", captainUserId: "unified-ride-captain" });
    const eligibility = jest.spyOn(service, "captainEligibility").mockResolvedValueOnce([{
      userId: "unified-ride-captain", blockers: ["NOT_IN_CONTROLLED_GROUP"]
    }] as never);

    await expect(service.addMember("ride-group", "admin-1", {
      memberType: ControlledSupplyMemberType.RIDE_CAPTAIN,
      captainUserId: "unified-ride-captain",
      reason: "Controlled unified Captain verification"
    })).resolves.toMatchObject({ id: "member-1" });

    expect(prisma.controlledSupplyMember.create).toHaveBeenCalledWith({ data: expect.objectContaining({ captainUserId: "unified-ride-captain" }) });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    eligibility.mockRestore();
  });

  it("does not enable controlled membership while Captain profile activation is incomplete", async () => {
    prisma.controlledSupplyMember.findFirst.mockResolvedValue({
      id: "member-1", captainUserId: "unified-ride-captain", vendorId: null, activatedAt: null,
      group: { cityCode: "KANO", serviceType: LaunchServiceType.RIDES, status: "ACTIVE", startAt: null, endAt: null }
    });
    const eligibility = jest.spyOn(service, "captainEligibility").mockResolvedValueOnce([{
      userId: "unified-ride-captain",
      blockers: ["ACTIVATION_PENDING", "MEMBERSHIP_ACTIVATION_PENDING"]
    }] as never);

    await expect(service.updateMember("ride-group", "member-1", "admin-1", {
      enabled: true,
      reason: "Attempt activation before profile is ready"
    })).rejects.toThrow("Controlled activation blocked: ACTIVATION_PENDING");

    expect(prisma.controlledSupplyMember.update).not.toHaveBeenCalled();
    eligibility.mockRestore();
  });

  it("requires the correct controlled group service and Captain member type", async () => {
    prisma.controlledSupplyMember.findFirst.mockResolvedValue({ id: "member" });

    await expect(service.accountEligible("Abuja FCT", LaunchServiceType.RIDES, "captain-1", UserRole.RIDER)).resolves.toBe(true);
    expect(prisma.controlledSupplyMember.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        captainUserId: "captain-1",
        enabled: true,
        memberType: { in: [ControlledSupplyMemberType.RIDE_CAPTAIN, ControlledSupplyMemberType.DUAL_MODE_CAPTAIN] },
        group: expect.objectContaining({ cityCode: "ABUJA", serviceType: LaunchServiceType.RIDES })
      })
    });
  });

  it("rejects a Captain member whose type does not match the group service", async () => {
    prisma.controlledSupplyGroup.findUnique.mockResolvedValue({
      id: "ride-group",
      serviceType: LaunchServiceType.RIDES,
      maximumMembers: 2,
      _count: { members: 0 }
    });

    await expect(service.addMember("ride-group", "admin-1", {
      memberType: ControlledSupplyMemberType.DELIVERY_CAPTAIN,
      captainUserId: "captain-1",
      reason: "Scheduled controlled operations"
    })).rejects.toThrow("Delivery Captains require an order or delivery controlled group");
  });

  it("enforces the configured controlled group capacity", async () => {
    prisma.controlledSupplyGroup.findUnique.mockResolvedValue({
      id: "ride-group",
      serviceType: LaunchServiceType.RIDES,
      maximumMembers: 1,
      _count: { members: 1 }
    });

    await expect(service.addMember("ride-group", "admin-1", {
      memberType: ControlledSupplyMemberType.RIDE_CAPTAIN,
      captainUserId: "captain-2",
      reason: "Scheduled controlled operations"
    })).rejects.toThrow("Controlled supply group member limit reached");
  });

  it("rejects a Partner member whose city does not match its controlled group", async () => {
    prisma.controlledSupplyGroup.findUnique.mockResolvedValue({
      id: "product-group",
      cityCode: "KANO",
      serviceType: LaunchServiceType.MARKETPLACE,
      maximumMembers: 2,
      _count: { members: 0 }
    });
    prisma.vendor.findFirst.mockResolvedValue({ id: "partner-1", city: "Abuja" });

    await expect(service.addMember("product-group", "admin-1", {
      memberType: ControlledSupplyMemberType.PRODUCT_SELLER,
      vendorId: "partner-1",
      reason: "Scheduled controlled operations"
    })).rejects.toThrow("Partner city does not match the controlled group");
  });

  it("rejects a Partner member from a Ride-only controlled group", async () => {
    prisma.controlledSupplyGroup.findUnique.mockResolvedValue({
      id: "ride-group",
      cityCode: "KANO",
      serviceType: LaunchServiceType.RIDES,
      maximumMembers: 2,
      _count: { members: 0 }
    });

    await expect(service.addMember("ride-group", "admin-1", {
      memberType: ControlledSupplyMemberType.MIXED_PARTNER,
      vendorId: "partner-1",
      reason: "Scheduled controlled operations"
    })).rejects.toThrow("Partners cannot join a RIDES controlled group");
  });

  it("blocks OPERATIONS_ONLY until every checklist item is complete or validly waived", async () => {
    prisma.launchOperationsChecklistItem.findMany.mockResolvedValue([
      { mandatory: true, status: LaunchChecklistItemStatus.COMPLETE, waiverExpiresAt: null },
      { mandatory: true, status: LaunchChecklistItemStatus.NOT_READY, waiverExpiresAt: null }
    ]);

    await expect(service.assertOperationsReady("Kano", LaunchServiceType.RIDES)).rejects.toThrow(
      "OPERATIONS_ONLY blocked: 1/2 checklist items satisfied"
    );
  });

  it("requires a reason and future expiry for a checklist waiver", async () => {
    prisma.launchOperationsChecklistItem.findFirst.mockResolvedValue({
      id: "check-1",
      status: LaunchChecklistItemStatus.NOT_READY
    });

    await expect(service.updateChecklist("Kano", LaunchServiceType.RIDES, "check-1", "admin-1", {
      status: LaunchChecklistItemStatus.WAIVED,
      waiverReason: "",
      waiverExpiresAt: new Date(Date.now() - 60_000).toISOString()
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.launchOperationsChecklistItem.update).not.toHaveBeenCalled();
  });
});
