import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, CustomerReferralStatus, Prisma, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

export const publicUserSelect = {
  id: true,
  fullName: true,
  phoneNumber: true,
  email: true,
  role: true,
  adminRole: true,
  accountStatus: true,
  phoneVerified: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(input: {
    fullName: string;
    phoneNumber: string;
    email?: string;
    passwordHash: string;
    referralCode?: string;
  }) {
    await this.assertUniqueIdentity(input.phoneNumber, input.email);
    const referralCode = input.referralCode?.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const referrer = referralCode ? await tx.customerProfile.findFirst({
        where: {
          OR: [
            { referralCode },
            { referralProfile: { code: referralCode } }
          ],
          user: { deletedAt: null }
        },
        include: { referralProfile: true }
      }) : null;

      if (referralCode && !referrer) {
        throw new BadRequestException("Referral code was not found");
      }

      const newReferralCode = this.generateReferralCode();
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          phoneNumber: input.phoneNumber,
          email: input.email,
          passwordHash: input.passwordHash,
          role: UserRole.CUSTOMER,
          customerProfile: {
            create: {
              referralCode: newReferralCode,
              referredBy: referrer?.id,
              referralProfile: {
                create: { code: newReferralCode }
              }
            }
          }
        },
        select: {
          ...publicUserSelect,
          customerProfile: true
        }
      });

      if (referrer && user.customerProfile) {
        const referrerProfile = referrer.referralProfile ?? await tx.customerReferralProfile.create({
          data: {
            customerId: referrer.id,
            code: referrer.referralCode
          }
        });

        await tx.customerReferral.create({
          data: {
            referrerProfileId: referrerProfile.id,
            referrerCustomerId: referrer.id,
            referredCustomerId: user.customerProfile.id,
            referralCode: referralCode!,
            status: CustomerReferralStatus.REGISTERED
          }
        });

        await tx.customerReferralProfile.update({
          where: { id: referrerProfile.id },
          data: {
            totalReferrals: { increment: 1 },
            lastReferralAt: new Date()
          }
        });
      }

      return user;
    });
  }

  findByPhoneForAuth(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        customerProfile: true,
        vendor: true,
        rider: true
      }
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...publicUserSelect,
        customerProfile: true,
        vendor: true,
        rider: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  markPhoneVerified(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          phoneVerified: true,
          accountStatus: AccountStatus.ACTIVE
        },
        select: publicUserSelect
      });

      const customer = await tx.customerProfile.findUnique({
        where: { userId: id },
        select: { id: true }
      });
      if (customer) {
        const referral = await tx.customerReferral.findUnique({
          where: { referredCustomerId: customer.id },
          select: { id: true, status: true, referrerProfileId: true }
        });
        if (referral?.status === CustomerReferralStatus.REGISTERED) {
          await tx.customerReferral.update({
            where: { id: referral.id },
            data: {
              status: CustomerReferralStatus.ACCOUNT_ACTIVATED,
              accountActivatedAt: new Date()
            }
          });
          await tx.customerReferralProfile.update({
            where: { id: referral.referrerProfileId },
            data: { activatedReferrals: { increment: 1 } }
          });
        }
      }

      return user;
    });
  }

  markLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: publicUserSelect
    });
  }

  private async assertUniqueIdentity(phoneNumber: string, email?: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber }, ...(email ? [{ email }] : [])]
      },
      select: { phoneNumber: true, email: true }
    });

    if (existing?.phoneNumber === phoneNumber) {
      throw new ConflictException("Phone number is already registered");
    }

    if (email && existing?.email === email) {
      throw new ConflictException("Email address is already registered");
    }
  }

  private generateReferralCode(): string {
    return `KGO-${randomBytes(5).toString("hex").toUpperCase()}`;
  }
}
