import { ValidationPipe } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorsService } from "./vendors.service";
import { UpdateVendorBranchDto } from "./dto/vendor-branch.dto";
import { InviteVendorTeamMemberDto } from "./dto/vendor-team.dto";
import { approvedOrderVendor } from "../vendor-dashboard-orders/vendor-order-access";
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  entity = "33333333-3333-4333-8333-333333333333";
describe("Partner P4 scoped operations", () => {
  let db: any, service: VendorsService;
  beforeEach(() => {
    db = {
      vendor: {
        findFirst: jest.fn(async () => ({
          id: owner,
          userId: owner,
          status: "ACTIVE",
          businessCategory: "RESTAURANT",
          user: { accountStatus: "ACTIVE", deletedAt: null },
        })),
        update: jest.fn(async ({ data }) => ({ id: owner, ...data })),
      },
      vendorBranch: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => ({
          id: entity,
          vendorId: owner,
          status: "ACTIVE",
        })),
        updateMany: jest.fn(),
        create: jest.fn(async ({ data }) => ({ id: entity, ...data })),
        update: jest.fn(async ({ data }) => ({ id: entity, ...data })),
        count: jest.fn(async () => 0),
      },
      vendorTeamMember: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }) => ({
          id: entity,
          invitationStatus: "PENDING",
          ...data,
        })),
        update: jest.fn(async ({ data }) => ({ id: entity, ...data })),
        count: jest.fn(async () => 0),
      },
      notification: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        count: jest.fn(async () => 0),
      },
      order: { findFirst: jest.fn(async () => null) },
      vendorSettlement: { findFirst: jest.fn(async () => null) },
      vendorApplication: { findFirst: jest.fn(async () => null) },
      supportTicket: { findFirst: jest.fn(async () => null) },
      vendorAuditLog: { create: jest.fn() },
      $queryRaw: jest.fn(async () => []),
      partnerMobileSession: { findFirst: jest.fn(async () => null) },
    };
    db.$transaction = async (fn: any) => fn(db);
    service = new VendorsService(db as PrismaService);
  });
  it.each(["PENDING_APPROVAL", "SUSPENDED", "CLOSED"])(
    "blocks %s from branch/team/inbox operations",
    async (status) => {
      db.vendor.findFirst.mockResolvedValue({
        id: owner,
        userId: owner,
        status,
        user: { accountStatus: "ACTIVE" },
      });
      await expect(service.branches(owner)).rejects.toThrow();
      await expect(service.team(owner)).rejects.toThrow();
      await expect(service.partnerNotifications(owner)).rejects.toThrow();
    },
  );
  it("does not grant team membership owner powers", async () => {
    db.vendor.findFirst.mockResolvedValue(null);
    await expect(
      service.inviteTeamMember(other, {
        fullName: "Staff",
        role: "MANAGER",
      } as any),
    ).rejects.toThrow();
    await expect(service.branches(other)).rejects.toThrow();
    expect(db.vendorTeamMember.create).not.toHaveBeenCalled();
  });
  it("scopes branch reads and rejects a foreign branch edit", async () => {
    await service.branches(owner);
    expect(db.vendorBranch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vendorId: owner } }),
    );
    db.vendorBranch.findFirst.mockResolvedValue(null);
    await expect(
      service.updateBranch(owner, other, { name: "Attempt" }),
    ).rejects.toThrow();
    expect(db.vendorBranch.update).not.toHaveBeenCalled();
  });
  it("serializes primary changes and clears primary on deactivation", async () => {
    await service.createBranch(owner, {
      name: "Branch",
      address: "Test address",
      city: "Abuja",
      state: "FCT",
      isPrimary: true,
    });
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.vendorBranch.updateMany).toHaveBeenCalledWith({
      where: { vendorId: owner, isPrimary: true },
      data: { isPrimary: false },
    });
    await service.updateBranch(owner, entity, { status: "INACTIVE" });
    expect(db.vendorBranch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "INACTIVE", isPrimary: false },
      }),
    );
  });
  it("validates PATCH fields at runtime, including attempted business reassignment", async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { vendorId: other },
        { type: "body", metatype: UpdateVendorBranchDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { status: "INVALID" },
        { type: "body", metatype: UpdateVendorBranchDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { name: "Valid branch" },
        { type: "body", metatype: UpdateVendorBranchDto },
      ),
    ).resolves.toMatchObject({ name: "Valid branch" });
  });
  it("does not expose invitation token hashes", async () => {
    db.vendorTeamMember.findMany.mockResolvedValue([
      { id: entity, role: "VIEWER", invitationTokenHash: "private-hash" },
    ]);
    expect(JSON.stringify(await service.team(owner))).not.toContain(
      "private-hash",
    );
    const member = await service.inviteTeamMember(owner, {
      fullName: "Synthetic staff",
      email: "staff@example.invalid",
      role: "MANAGER",
    });
    expect(member).not.toHaveProperty("invitationTokenHash");
    expect(member).toHaveProperty("invitationTokenReturned", false);
  });
  it("rejects ownership escalation through both validation and service", async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { fullName: "Staff", email: "staff@example.invalid", role: "OWNER" },
        { type: "body", metatype: InviteVendorTeamMemberDto },
      ),
    ).rejects.toThrow();
    await expect(
      service.inviteTeamMember(owner, {
        fullName: "Staff",
        email: "staff@example.invalid",
        role: "OWNER",
      }),
    ).rejects.toThrow();
  });
  it("cannot edit foreign team records or revoke the required owner", async () => {
    await expect(
      service.updateTeamMember(owner, other, { role: "MANAGER" }),
    ).rejects.toThrow();
    db.vendorTeamMember.findFirst.mockResolvedValue({
      id: entity,
      role: "OWNER",
      userId: owner,
      invitationStatus: "PENDING",
    });
    await expect(service.revokeTeamMember(owner, entity)).rejects.toThrow();
    expect(db.vendorTeamMember.update).not.toHaveBeenCalled();
  });
  it("validates hours without changing temporary availability", async () => {
    await service.update(owner, { openingTime: "22:00", closingTime: "05:00" });
    expect(db.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { openingTime: "22:00", closingTime: "05:00" },
      }),
    );
    await expect(
      service.update(owner, { openingTime: "25:99" }),
    ).rejects.toThrow();
  });
  it("redacts raw customer content in the Partner notification list", async () => {
    db.notification.findMany.mockResolvedValue([
      {
        id: entity,
        entityType: "Order",
        title: "Customer full name",
        message: "Private address",
        isRead: false,
        createdAt: new Date(),
      },
    ]);
    const rows = await service.partnerNotifications(owner);
    expect(JSON.stringify(rows)).not.toMatch(
      /Customer full name|Private address/,
    );
    expect(rows[0].title).toBe("Order update");
  });
  it("will not read another user's notice or navigate to another business's order", async () => {
    await expect(
      service.readPartnerNotification(owner, other),
    ).rejects.toThrow();
    db.notification.findFirst.mockResolvedValue({
      entityType: "Order",
      entityId: entity,
    });
    await expect(
      service.partnerNotificationTarget(owner, entity),
    ).rejects.toThrow();
    db.order.findFirst.mockResolvedValue({ id: entity });
    expect(await service.partnerNotificationTarget(owner, entity)).toEqual({
      route: "order",
      id: entity,
    });
    expect(db.order.findFirst).toHaveBeenCalledWith({
      where: { id: entity, vendorId: owner },
      select: { id: true },
    });
  });
  it("blocks deactivated accounts and signed-out sessions", async () => {
    db.vendor.findFirst.mockResolvedValue(null);
    await expect(approvedOrderVendor(db, owner)).rejects.toThrow();
    db.partnerMobileSession.findFirst.mockResolvedValue({ id: entity });
    await expect(
      approvedOrderVendor(db, owner, "revoked-hash"),
    ).rejects.toThrow();
  });
});
