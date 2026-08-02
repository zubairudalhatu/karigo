import {
  AccountDeletionAccountType,
  AccountDeletionStatus,
  AccountStatus,
  RiderStatus,
  UserRole
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AccountDeletionService } from "./account-deletion.service";

const baseUser = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Aisha Customer",
  phoneNumber: "+2348012345678",
  email: "aisha@karigo.local",
  role: UserRole.CUSTOMER,
  adminRole: null,
  accountStatus: AccountStatus.ACTIVE,
  customerProfile: { id: "22222222-2222-4222-8222-222222222222" },
  rider: null,
  vendor: null,
  taxiDriverProfiles: [],
  deliveryCaptainApplications: [],
  taxiDriverApplications: [],
  vendorApplications: [],
  captainWorkState: null
};

const requestRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  requestReference: "ADR-20260802-ABC12345",
  userId: baseUser.id,
  accountType: AccountDeletionAccountType.CUSTOMER,
  status: AccountDeletionStatus.REQUESTED,
  reason: "No longer needed",
  requestedAt: new Date("2026-08-02T10:00:00.000Z"),
  confirmedAt: new Date("2026-08-02T10:00:00.000Z"),
  processingStartedAt: null,
  completedAt: null,
  cancelledAt: null,
  blockedReasonCode: null,
  blockerSummary: null,
  adminNote: null,
  adminReviewedById: null,
  adminReviewedAt: null,
  createdAt: new Date("2026-08-02T10:00:00.000Z"),
  updatedAt: new Date("2026-08-02T10:00:00.000Z"),
  user: baseUser,
  adminReviewedBy: null
};

describe("AccountDeletionService", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    accountDeletionRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    order: { count: jest.fn() },
    taxiTrip: { count: jest.fn() },
    riderEarning: { count: jest.fn() },
    vendorSettlement: { count: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    rider: { updateMany: jest.fn() },
    taxiDriverProfile: { updateMany: jest.fn() },
    captainWorkState: { updateMany: jest.fn() },
    vendor: { update: jest.fn() },
    vendorBranch: { updateMany: jest.fn() },
    $transaction: jest.fn()
  };
  const audit = { record: jest.fn() };
  const service = new AccountDeletionService(prisma as unknown as PrismaService, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    prisma.accountDeletionRequest.create.mockResolvedValue(requestRecord);
    prisma.accountDeletionRequest.findUnique.mockResolvedValue(requestRecord);
    prisma.accountDeletionRequest.update.mockImplementation(async ({ data }) => ({
      ...requestRecord,
      ...data,
      user: requestRecord.user,
      adminReviewedBy: null
    }));
    prisma.order.count.mockResolvedValue(0);
    prisma.taxiTrip.count.mockResolvedValue(0);
    prisma.riderEarning.count.mockResolvedValue(0);
    prisma.vendorSettlement.count.mockResolvedValue(0);
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.rider.updateMany.mockResolvedValue({ count: 1 });
    prisma.taxiDriverProfile.updateMany.mockResolvedValue({ count: 0 });
    prisma.captainWorkState.updateMany.mockResolvedValue({ count: 0 });
    prisma.vendor.update.mockResolvedValue({});
    prisma.vendorBranch.updateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
  });

  it("records a blocked customer deletion request when active orders exist", async () => {
    prisma.order.count.mockResolvedValueOnce(2);
    prisma.accountDeletionRequest.create.mockImplementationOnce(async ({ data }) => ({
      ...requestRecord,
      ...data,
      user: requestRecord.user,
      adminReviewedBy: null
    }));

    const result = await service.request(baseUser.id, {
      accountType: AccountDeletionAccountType.CUSTOMER,
      confirmation: "DELETE"
    });

    expect(result.status).toBe(AccountDeletionStatus.BLOCKED);
    expect(result.blockers[0]).toEqual(expect.objectContaining({
      code: "ACTIVE_ORDER_EXISTS",
      count: 2
    }));
    expect(prisma.accountDeletionRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: AccountDeletionStatus.BLOCKED,
        blockedReasonCode: "ACTIVE_ORDER_EXISTS"
      })
    }));
  });

  it("revokes sessions and takes Captain access offline when processing starts", async () => {
    const captainUser = {
      ...baseUser,
      role: UserRole.RIDER,
      customerProfile: null,
      rider: { id: "44444444-4444-4444-8444-444444444444", availabilityStatus: RiderStatus.ONLINE },
      taxiDriverProfiles: [{ id: "55555555-5555-4555-8555-555555555555", isAvailableForTaxi: true }],
      captainWorkState: { activeWorkMode: "RIDE" }
    };
    prisma.accountDeletionRequest.findUnique.mockResolvedValueOnce({
      ...requestRecord,
      accountType: AccountDeletionAccountType.CAPTAIN,
      user: captainUser
    });

    await service.adminUpdate("99999999-9999-4999-8999-999999999999", requestRecord.id, {
      status: AccountDeletionStatus.PROCESSING,
      adminNote: "Verified no active work."
    });

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: captainUser.id, revokedAt: null }
    }));
    expect(prisma.rider.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { availabilityStatus: RiderStatus.OFFLINE }
    }));
    expect(prisma.captainWorkState.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        desiredDeliveryOnline: false,
        desiredRideOnline: false,
        activeWorkMode: null
      })
    }));
  });

  it("keeps a processing request blocked when live blockers are found", async () => {
    prisma.order.count.mockResolvedValueOnce(1);

    const result = await service.adminUpdate("99999999-9999-4999-8999-999999999999", requestRecord.id, {
      status: AccountDeletionStatus.PROCESSING,
      adminNote: "Ready to process."
    });

    expect(result.status).toBe(AccountDeletionStatus.BLOCKED);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.any(String),
      "ACCOUNT_DELETION_BLOCKED",
      "AccountDeletionRequest",
      requestRecord.id,
      expect.objectContaining({ blockers: expect.any(Array) })
    );
  });
});
