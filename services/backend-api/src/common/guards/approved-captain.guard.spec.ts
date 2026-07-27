import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AccountStatus, RiderStatus } from "@prisma/client";
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
    rider: { findUnique: jest.fn() }
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

    await expect(guard.canActivate(contextFor("customer-user"))).resolves.toBe(true);
    expect(prisma.rider.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "customer-user" }
    }));
  });

  it("blocks pending applicants from Captain operations", async () => {
    prisma.rider.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor("customer-user"))).rejects.toThrow(ForbiddenException);
  });
});
