import { BadRequestException } from "@nestjs/common";
import {
  ControlledSupplyMemberType,
  LaunchChecklistItemStatus,
  LaunchServiceType,
  UserRole
} from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ControlledSupplyService } from "./controlled-supply.service";

describe("ControlledSupplyService", () => {
  const prisma: any = {
    controlledOperationsCustomer: { findFirst: jest.fn() },
    controlledSupplyGroup: { findUnique: jest.fn() },
    controlledSupplyMember: { findFirst: jest.fn() },
    launchOperationsChecklistItem: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    launchDrill: { count: jest.fn() },
    vendor: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations))
  };
  const audit = { record: jest.fn() };
  const service = new ControlledSupplyService(
    prisma as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.launchOperationsChecklistItem.upsert.mockResolvedValue({ id: "check" });
    prisma.launchDrill.count.mockResolvedValue(0);
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
