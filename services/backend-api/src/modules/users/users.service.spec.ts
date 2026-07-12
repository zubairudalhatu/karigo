import { BadRequestException } from "@nestjs/common";
import { AccountStatus, CustomerReferralStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "./users.service";

const user = {
  id: "user-1",
  fullName: "New Customer",
  phoneNumber: "+2348012345678",
  email: "new@karigo.local",
  role: UserRole.CUSTOMER,
  adminRole: null,
  accountStatus: AccountStatus.PENDING,
  phoneVerified: false,
  emailVerified: false,
  lastLoginAt: null,
  createdAt: new Date("2026-07-12T12:00:00.000Z"),
  updatedAt: new Date("2026-07-12T12:00:00.000Z"),
  customerProfile: {
    id: "customer-2",
    referralCode: "KGO-NEWCODE"
  }
};
const referrer = {
  id: "customer-1",
  referralCode: "KGO-REFERRER",
  referralProfile: {
    id: "profile-1",
    customerId: "customer-1",
    code: "KGO-REFERRER"
  }
};

describe("UsersService", () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    customerProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    customerReferralProfile: {
      create: jest.fn(),
      update: jest.fn()
    },
    customerReferral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn()
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user);
    prisma.customerProfile.findFirst.mockResolvedValue(referrer);
    prisma.customerReferralProfile.update.mockResolvedValue(referrer.referralProfile);
    prisma.customerReferral.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
  });

  it("creates a customer referral record when a valid referral code is supplied", async () => {
    await service.createCustomer({
      fullName: "New Customer",
      phoneNumber: "+2348012345678",
      email: "new@karigo.local",
      passwordHash: "hashed-password",
      referralCode: "kgo-referrer"
    });

    expect(prisma.customerProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { referralCode: "KGO-REFERRER" },
          { referralProfile: { code: "KGO-REFERRER" } }
        ]
      })
    }));
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerProfile: {
          create: expect.objectContaining({
            referredBy: referrer.id,
            referralCode: expect.stringMatching(/^KGO-[A-F0-9]{10}$/),
            referralProfile: {
              create: { code: expect.stringMatching(/^KGO-[A-F0-9]{10}$/) }
            }
          })
        }
      })
    }));
    expect(prisma.customerReferral.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        referrerProfileId: referrer.referralProfile.id,
        referrerCustomerId: referrer.id,
        referredCustomerId: user.customerProfile.id,
        referralCode: "KGO-REFERRER",
        status: CustomerReferralStatus.REGISTERED
      })
    }));
  });

  it("rejects an unknown referral code without creating a user", async () => {
    prisma.customerProfile.findFirst.mockResolvedValue(null);

    await expect(service.createCustomer({
      fullName: "New Customer",
      phoneNumber: "+2348012345678",
      passwordHash: "hashed-password",
      referralCode: "KGO-MISSING"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.customerReferral.create).not.toHaveBeenCalled();
  });

  it("marks a referred customer as account activated after phone verification", async () => {
    prisma.user.update.mockResolvedValue({ id: user.id, role: UserRole.CUSTOMER });
    prisma.customerProfile.findUnique.mockResolvedValue({ id: user.customerProfile.id });
    prisma.customerReferral.findUnique.mockResolvedValue({
      id: "referral-1",
      status: CustomerReferralStatus.REGISTERED,
      referrerProfileId: referrer.referralProfile.id
    });
    prisma.customerReferral.update.mockResolvedValue({});
    prisma.customerReferralProfile.update.mockResolvedValue({});

    await service.markPhoneVerified(user.id);

    expect(prisma.customerReferral.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: CustomerReferralStatus.ACCOUNT_ACTIVATED,
        accountActivatedAt: expect.any(Date)
      })
    }));
    expect(prisma.customerReferralProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { activatedReferrals: { increment: 1 } }
    }));
  });
});
