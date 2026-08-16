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
    user: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    controlledSupplyGroup: { findFirst: jest.fn() },
    controlledOperationsCustomer: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn(), count: jest.fn() },
    rider: { count: jest.fn() },
    taxiDriverApplication: { count: jest.fn() },
    deliveryCaptainApplication: { count: jest.fn() },
    taxiDriverProfile: { count: jest.fn() },
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
  const adminOperations: any = {
    users: jest.fn(),
    riders: jest.fn(),
    vendors: jest.fn()
  };
  const service = new QuickLaunchService(prisma, controlled, launch, adminOperations);
  const riderSource = (userId: string, fullName: string, phoneNumber: string, city = "Kano") => ({
    id: `rider-${userId}`, riderCode: `KGO-${userId}`, phoneNumber, vehicleType: "CAR", availabilityStatus: "ONLINE", verificationStatus: "ACTIVE",
    currentLocationUpdatedAt: new Date().toISOString(), user: { id: userId, fullName, accountStatus: AccountStatus.ACTIVE, phoneVerified: true },
    deliveryApplication: null, rideApplication: { applicationReference: `APP-${userId}`, status: "APPROVED", city, state: city },
    rideProfile: { status: "ACTIVE", city, state: city }, operationalModes: ["RIDE_CAPTAIN"]
  });
  const vendorSource = (id: string, businessName: string, phoneNumber: string) => ({ id, userId: `user-${id}`, businessName, tradingName: businessName, applicationReference: `APP-${id}`, phoneNumber, email: null, city: "Kano", status: "ACTIVE", isOpen: true, partnerType: "BOTH", productCount: 1, serviceCount: 1, activeOrderCount: 0, user: { fullName: `${businessName} Owner`, phoneNumber, email: null, accountStatus: AccountStatus.ACTIVE } });


  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.count.mockResolvedValue(1);
    prisma.vendor.count.mockResolvedValue(0);
    prisma.rider.count.mockResolvedValue(0);
    prisma.taxiDriverApplication.count.mockResolvedValue(0);
    prisma.deliveryCaptainApplication.count.mockResolvedValue(0);
    prisma.taxiDriverProfile.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([{
      id: "customer-1", fullName: "KariGO Operations", phoneNumber: "+2348000000001", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, customerProfile: { referralCode: "KGO-CUST-1" },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);
    adminOperations.users.mockResolvedValue([{ id: "customer-1", fullName: "KariGO Operations", phoneNumber: "+2348000000001", role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE }]);
    adminOperations.riders.mockResolvedValue([{
      id: "rider-1", riderCode: "KGO-CAP-1", phoneNumber: "+2348000000002", vehicleType: "CAR",
      availabilityStatus: "ONLINE", verificationStatus: "ACTIVE", currentLocationUpdatedAt: new Date().toISOString(),
      user: { id: "captain-1", fullName: "Ready Captain", accountStatus: AccountStatus.ACTIVE, phoneVerified: true },
      deliveryApplication: null, rideApplication: { applicationReference: "KGO-CAP-1", status: "APPROVED", city: "Kano", state: "Kano" },
      rideProfile: { status: "ACTIVE", city: "Kano", state: "Kano" }, operationalModes: ["RIDE_CAPTAIN"]
    }]);
    adminOperations.vendors.mockResolvedValue([{
      id: "partner-1", userId: "partner-user", businessName: "Ready Partner", tradingName: "Ready Partner", applicationReference: "KGO-PAR-1",
      phoneNumber: "+2348000000003", email: null, city: "Kano", status: "ACTIVE", isOpen: true, partnerType: "PRODUCT_SELLER",
      productCount: 1, serviceCount: 0, activeOrderCount: 0,
      user: { fullName: "Ready Partner Owner", phoneNumber: "+2348000000003", email: null, accountStatus: AccountStatus.ACTIVE }
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
      blockers: ["MEMBERSHIP_ACTIVATION_PENDING"], city: "Kano"
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
    expect(query).toEqual(expect.objectContaining({ where: { deletedAt: null, id: { in: ["customer-1"] } } }));
    expect(query.where).not.toHaveProperty("role");
    expect(query.where).not.toHaveProperty("customerProfile");
  });

  it("matches a stored canonical Customer phone when Operations enters local form", async () => {
    await expect(service.customerCandidates("Kano", "08000000001")).resolves.toHaveLength(1);
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null, id: { in: ["customer-1"] } });
  });

  it("matches a stored local Customer phone when Operations enters canonical form", async () => {
    adminOperations.users.mockResolvedValueOnce([{ id: "customer-local", fullName: "Local Customer", phoneNumber: "08033686696", role: UserRole.CUSTOMER, accountStatus: AccountStatus.ACTIVE }]);
    prisma.user.findMany.mockResolvedValue([{
      id: "customer-local", fullName: "Local Customer", phoneNumber: "08033686696", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-LOCAL" },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);
    const result = await service.customerCandidates("Kano", "+2348033686696");
    expect(result[0]).toMatchObject({ phoneNumber: "08033686696", ready: true });
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ id: { in: ["customer-local"] } });
  });

  it("returns a matching Customer app account without a Customer profile as blocked", async () => {
    prisma.user.findMany.mockResolvedValue([{
      id: "profile-missing", fullName: "Profile Missing", phoneNumber: "+2348126733333", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: null,
      addresses: [{ city: "Abuja", state: "FCT", isDefault: true }]
    }]);

    const result = await service.customerCandidates("Abuja", "08126733333");

    expect(result[0]).toMatchObject({ userId: "profile-missing", ready: false, blockerMessages: ["Customer profile is incomplete"] });
    expect(prisma.user.findMany.mock.calls[0][0].where).not.toHaveProperty("customerProfile");
  });

  it("returns a profiled Customer READY when the Abuja service-area address is valid", async () => {
    prisma.user.findMany.mockResolvedValueOnce([{
      id: "abuja-customer", fullName: "Abuja Customer", phoneNumber: "+2348126733333", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-ABUJA" },
      addresses: [{ city: "Abuja", state: "Federal Capital Territory", isDefault: true }]
    }]);

    await expect(service.customerCandidates("Abuja", "Abuja Customer")).resolves.toEqual([
      expect.objectContaining({ userId: "abuja-customer", cityReadiness: "Ready for Abuja", ready: true })
    ]);
  });

  it("matches punctuation-formatted stored Customer phones in memory", async () => {
    prisma.user.findMany.mockResolvedValue([{
      id: "formatted-phone", fullName: "Formatted Phone", phoneNumber: "+234 (803) 368-6696", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-FORMAT" },
      addresses: [{ city: "Kano", state: "Kano", isDefault: true }]
    }]);

    await expect(service.customerCandidates("Kano", "08033686696")).resolves.toEqual([
      expect.objectContaining({ userId: "formatted-phone", ready: true })
    ]);
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
    expect(result[0]).toMatchObject({ ready: false, cityReadiness: "No Abuja service-area address", blockerCodes: ["CITY_MISMATCH"], blockerMessages: ["Customer has no address in Abuja"] });
  });

  it("turns setup-only Captain blockers into READY while keeping operational blockers visible", async () => {
    const ready = await service.captainCandidates("Kano", LaunchServiceType.RIDES, "Ready");
    expect(ready[0]).toMatchObject({ ready: true, blockerMessages: [] });
    expect(ready[0]).not.toHaveProperty("blockers");
    expect(ready[0]).not.toHaveProperty("eligibility");

    adminOperations.riders.mockResolvedValueOnce([riderSource("captain-2", "Stale Captain", "0802")]);
    controlled.captainEligibility.mockResolvedValueOnce([{ userId: "captain-2", captainName: "Stale Captain", phoneNumber: "0802", blockers: ["LOCATION_STALE"] }]);
    const blocked = await service.captainCandidates("Kano", LaunchServiceType.RIDES);
    expect(blocked[0]).toMatchObject({ ready: false, blockerMessages: ["Refresh Captain GPS"] });
  });

  it("keeps Captain profile activation pending as a blocker", async () => {
    adminOperations.riders.mockResolvedValueOnce([riderSource("pending-captain", "Pending Captain", "+2348033686696")]);
    controlled.captainEligibility.mockResolvedValueOnce([{
      userId: "pending-captain", captainName: "Pending Captain", phoneNumber: "+2348033686696",
      rideStatus: "PENDING_ACTIVATION", blockers: ["ACTIVATION_PENDING", "NOT_IN_CONTROLLED_GROUP"], city: "Kano"
    }]);

    const result = await service.captainCandidates("Kano", LaunchServiceType.RIDES, "Pending Captain");

    expect(result[0]).toMatchObject({ ready: false, blockerCodes: ["ACTIVATION_PENDING"], blockerMessages: ["Captain activation is incomplete"] });
  });

  it.each([
    ["08033686696", "+2348033686696"],
    ["+2348033686696", "08033686696"],
    ["8033686696", "+2348033686696"],
    ["08033686696", "+234 (803) 368-6696"]
  ])("matches Captain phone query %s against stored %s", async (query, stored) => {
    adminOperations.riders.mockResolvedValueOnce([riderSource("captain-phone", "Phone Captain", stored)]);
    controlled.captainEligibility.mockResolvedValueOnce([{ userId: "captain-phone", captainName: "Phone Captain", phoneNumber: stored, captainCode: "KGO-CAP-PHONE", blockers: ["NOT_IN_CONTROLLED_GROUP"], city: "Kano" }]);
    const result = await service.captainCandidates("Kano", LaunchServiceType.RIDES, query);
    expect(result[0]).toMatchObject({ phoneNumber: stored, capabilityLabel: "Ride and Delivery Captain", rideCapability: true, deliveryCapability: true, ready: true });
  });

  it.each([
    ["08033686696", "+2348033686696"],
    ["+2348033686696", "08033686696"],
    ["8033686696", "2348033686696"],
    ["08033686696", "+234-803-368-6696"]
  ])("matches Partner phone query %s against stored %s", async (query, stored) => {
    adminOperations.vendors.mockResolvedValueOnce([vendorSource("partner-phone", "Phone Partner", stored)]);
    controlled.partnerEligibility.mockResolvedValueOnce([{ userId: "partner-user", vendorId: "partner-phone", businessName: "Phone Partner", phoneNumber: stored, partnerCode: "KGO-PAR-PHONE", capability: "BOTH", blockers: ["NOT_IN_CONTROLLED_GROUP"], city: "Kano" }]);
    const result = await service.partnerCandidates("Kano", LaunchServiceType.MARKETPLACE, query);
    expect(result[0]).toMatchObject({ phoneNumber: stored, capabilityLabel: "Product Seller and Service Provider", ready: true });
  });

  it("shows a Kano Captain under Abuja with a CITY_MISMATCH blocker", async () => {
    adminOperations.riders.mockResolvedValueOnce([riderSource("kano-captain", "Kano Captain", "+2348033686696", "Kano")]);
    controlled.captainEligibility.mockResolvedValueOnce([{
      userId: "kano-captain", captainName: "Kano Captain", phoneNumber: "+2348033686696", captainCode: "KGO-KANO",
      blockers: ["CITY_MISMATCH", "NOT_IN_CONTROLLED_GROUP"], city: "Kano"
    }]);

    const result = await service.captainCandidates("Abuja", LaunchServiceType.RIDES, "08033686696");

    expect(result[0]).toMatchObject({ city: "Kano", ready: false, blockerCodes: ["CITY_MISMATCH"], blockerMessages: ["Captain is not approved for Abuja"] });
  });

  it("keeps the Quick Launch start assertion strict for a city-mismatched Captain", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "customer-1", fullName: "Abuja Customer", phoneNumber: "+2348126733333", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: { referralCode: "KGO-ABUJA" },
      addresses: [{ city: "Abuja", state: "FCT" }]
    });
    controlled.captainEligibility.mockResolvedValueOnce([{
      userId: "kano-captain", captainName: "Kano Captain", phoneNumber: "+2348033686696", captainCode: "KGO-KANO",
      blockers: ["CITY_MISMATCH", "NOT_IN_CONTROLLED_GROUP"], city: "Kano"
    }]);

    await expect(service.start("admin-1", {
      city: "Abuja", serviceType: LaunchServiceType.RIDES, customerUserId: "customer-1", captainUserId: "kano-captain",
      reason: "Verify city mismatch remains blocked", confirmed: true
    })).rejects.toThrow("Captain is not approved for Abuja");
    expect(launch.updateConfig).not.toHaveBeenCalled();
  });

  it("keeps the Quick Launch start assertion strict when Customer capability is incomplete", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "profile-missing", fullName: "Profile Missing", phoneNumber: "+2348126733333", role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE, phoneVerified: true, deletedAt: null, customerProfile: null,
      addresses: [{ city: "Kano", state: "Kano" }]
    });

    await expect(service.start("admin-1", {
      city: "Kano", serviceType: LaunchServiceType.RIDES, customerUserId: "profile-missing", captainUserId: "captain-1",
      reason: "Verify incomplete Customer remains blocked", confirmed: true
    })).rejects.toThrow("Customer profile is incomplete");
  });

  it("discovers an authoritative Admin Rider even when eligibility enrichment is missing", async () => {
    adminOperations.riders.mockResolvedValueOnce([riderSource("source-captain", "Source Captain", "+2348030000001")]);
    controlled.captainEligibility.mockResolvedValueOnce([]);
    const result = await service.captainCandidates("Kano", LaunchServiceType.RIDES, "Source Captain");
    expect(result[0]).toMatchObject({ userId: "source-captain", fullName: "Source Captain", ready: false, blockerCodes: ["PROFILE_INCOMPLETE"] });
  });

  it("discovers an authoritative Admin Vendor even when eligibility enrichment is missing", async () => {
    adminOperations.vendors.mockResolvedValueOnce([vendorSource("source-partner", "Source Partner", "+2348030000002")]);
    controlled.partnerEligibility.mockResolvedValueOnce([]);
    const result = await service.partnerCandidates("Kano", LaunchServiceType.MARKETPLACE, "Source Partner");
    expect(result[0]).toMatchObject({ vendorId: "source-partner", businessName: "Source Partner", ready: false, blockerCodes: ["PROFILE_INCOMPLETE"] });
  });

  it("shows city and stale-location blockers together", async () => {
    adminOperations.riders.mockResolvedValueOnce([riderSource("multi-blocked", "Multi Blocked", "+2348030000003", "Kano")]);
    controlled.captainEligibility.mockResolvedValueOnce([{ userId: "multi-blocked", captainName: "Multi Blocked", phoneNumber: "+2348030000003", city: "Kano", blockers: ["CITY_MISMATCH", "LOCATION_STALE", "NOT_IN_CONTROLLED_GROUP"] }]);
    const result = await service.captainCandidates("Abuja", LaunchServiceType.RIDES, "Multi Blocked");
    expect(result[0]).toMatchObject({ ready: false, diagnosticCodes: ["CITY_MISMATCH", "LOCATION_STALE"], blockerMessages: ["Captain is not approved for Abuja", "Refresh Captain GPS"] });
  });

  it("supports browse pagination and reserves IDENTITY_NOT_FOUND for genuine absence", async () => {
    const browse = await service.customerDiscovery({ city: "Kano", page: 1, pageSize: 10 });
    expect(browse).toMatchObject({ items: [expect.objectContaining({ userId: "customer-1" })], pagination: { page: 1, pageSize: 10, total: 1, hasMore: false }, diagnosticCode: null });
    prisma.user.findMany.mockResolvedValueOnce([]);
    const missing = await service.customerDiscovery({ city: "Kano", query: "Absent Identity" });
    expect(missing).toMatchObject({ items: [], diagnosticCode: "IDENTITY_NOT_FOUND" });
  });

  it("returns privacy-safe read-only authoritative identity diagnostics", async () => {
    const result = await service.identityDiagnostics();
    expect(result).toMatchObject({ readOnly: true, containsPrivateDocumentUrls: false, sourceRoutes: { customers: "Admin Users / admin/users", captains: "Admin Captains/Riders / admin/riders", partners: "Admin Vendors / admin/vendors" } });
    expect(result.counts).toMatchObject({ customersVisible: 1, rideCaptainsVisible: 1, deliveryCaptainsVisible: 1, partnersVisible: 1 });
    expect(JSON.stringify(result)).not.toMatch(/"(password|token|otp|documentUrl)"/i);
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
