import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, Prisma, UserRole } from "@prisma/client";
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
  }) {
    await this.assertUniqueIdentity(input.phoneNumber, input.email);

    return this.prisma.user.create({
      data: {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        email: input.email,
        passwordHash: input.passwordHash,
        role: UserRole.CUSTOMER,
        customerProfile: {
          create: {
            referralCode: `KGO-${randomBytes(4).toString("hex").toUpperCase()}`
          }
        }
      },
      select: {
        ...publicUserSelect,
        customerProfile: true
      }
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
    return this.prisma.user.update({
      where: { id },
      data: {
        phoneVerified: true,
        accountStatus: AccountStatus.ACTIVE
      },
      select: publicUserSelect
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
}
