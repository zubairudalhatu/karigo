import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AccountStatus, RiderStatus, TaxiDriverProfileStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ApprovedCaptainGuard } from "./approved-captain.guard";

function contextFor(userId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id: userId, role: "CUSTOMER" } : undefined })
    })
  } as unknown as ExecutionContext;
}

describe("ApprovedCaptainGuard", () => {
  const prisma = {
    rider: { findUnique: jest.fn() },
    taxiDriverProfile: { findUnique: jest.fn() }
  };
  const guard = new ApprovedCaptainGuard(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows an active approved Captain profile even when the base account role is Customer", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      deletedAt: null,
      verificationStatus: RiderStatus.ACTIVE,
      user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
    });
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor("customer-user"))).resolves.toBe(true);
    expect(prisma.rider.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "customer-user" }
    }));
  });

  it("allows an active Ride Captain profile when Delivery activation is still pending", async () => {
    prisma.rider.findUnique.mockResolvedValue({
      deletedAt: null,
      verificationStatus: RiderStatus.PENDING_APPROVAL,
      user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
    });
    prisma.taxiDriverProfile.findUnique.mockResolvedValue({
      status: TaxiDriverProfileStatus.ACTIVE,
      user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
    });

    await expect(guard.canActivate(contextFor("ride-user"))).resolves.toBe(true);
    expect(prisma.taxiDriverProfile.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "ride-user" }
    }));
  });

  it("blocks pending applicants from Captain operations", async () => {
    prisma.rider.findUnique.mockResolvedValue(null);
    prisma.taxiDriverProfile.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor("customer-user"))).rejects.toThrow(ForbiddenException);
  });
});
