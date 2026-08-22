import { CustomersService } from "./customers.service";

describe("CustomersService Ride safety preference", () => {
  const profile = {
    id: "10000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
    requireRidePin: false
  };
  const user = {
    id: profile.userId,
    fullName: "Amina Customer",
    phoneNumber: "+2348000000001",
    email: null,
    role: "CUSTOMER",
    adminRole: null,
    accountStatus: "ACTIVE",
    phoneVerified: true,
    profilePhotoUrl: null,
    createdAt: new Date("2026-08-22T00:00:00.000Z"),
    updatedAt: new Date("2026-08-22T00:00:00.000Z"),
    customerProfile: profile
  };
  const prisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    customerProfile: { findUnique: jest.fn() }
  };
  const service = new CustomersService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockImplementation(async ({ data }: any) => ({
      ...user,
      customerProfile: {
        ...profile,
        requireRidePin: data.customerProfile?.update?.requireRidePin ?? profile.requireRidePin
      }
    }));
  });

  it("returns the server-authoritative default-off Ride PIN preference", async () => {
    await expect(service.me(user.id)).resolves.toMatchObject({ requireRidePin: false });
  });

  it.each([true, false])("persists Require Ride PIN=%s on CustomerProfile rather than local app state", async (requireRidePin) => {
    const result = await service.update(user.id, { requireRidePin });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id },
      data: { customerProfile: { update: { requireRidePin } } }
    }));
    expect(result.requireRidePin).toBe(requireRidePin);
  });

  it("updates profile identity fields without changing the Ride PIN preference", async () => {
    await service.update(user.id, { fullName: "Amina Updated" });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { fullName: "Amina Updated" }
    }));
    expect(prisma.user.update.mock.calls[0][0].data.customerProfile).toBeUndefined();
  });
});
