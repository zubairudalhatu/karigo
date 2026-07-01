import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AppSurface, PushProvider, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";

@Injectable()
export class DeviceTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, role: UserRole, dto: RegisterDeviceTokenDto) {
    const token = dto.token.trim();
    this.assertAppSurface(role, dto.appSurface);
    this.assertTokenShape(dto.provider, token);
    const existing = await this.prisma.deviceToken.findUnique({ where: { token } });
    if (existing && existing.userId !== userId) {
      throw new ConflictException("Device token is already registered");
    }
    if (existing) {
      return this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          platform: dto.platform,
          provider: dto.provider,
          appSurface: dto.appSurface,
          deviceId: dto.deviceId,
          isActive: true,
          lastSeenAt: new Date()
        },
        select: this.safeFields
      });
    }
    return this.prisma.deviceToken.create({
      data: { ...dto, token, userId, isActive: true, lastSeenAt: new Date() },
      select: this.safeFields
    });
  }

  listMine(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: this.safeFields,
      orderBy: { lastSeenAt: "desc" }
    });
  }

  async deactivate(userId: string, id: string) {
    const existing = await this.prisma.deviceToken.findFirst({ where: { id, userId, isActive: true } });
    if (!existing) throw new NotFoundException("Device token not found");
    return this.prisma.deviceToken.update({
      where: { id },
      data: { isActive: false, lastSeenAt: new Date() },
      select: this.safeFields
    });
  }

  private readonly safeFields = {
    id: true,
    platform: true,
    provider: true,
    appSurface: true,
    isActive: true,
    lastSeenAt: true,
    createdAt: true,
    updatedAt: true
  } as const;

  private assertAppSurface(role: UserRole, surface: AppSurface) {
    const allowedSurface: Record<UserRole, AppSurface> = {
      CUSTOMER: AppSurface.CUSTOMER_APP,
      RIDER: AppSurface.RIDER_APP,
      VENDOR: AppSurface.VENDOR_DASHBOARD,
      ADMIN: AppSurface.ADMIN_PORTAL
    };
    if (allowedSurface[role] !== surface) {
      throw new ForbiddenException("Device token app surface does not match the authenticated role");
    }
  }

  private assertTokenShape(provider: PushProvider, token: string) {
    const hasWhitespace = /\s/.test(token);
    const expoToken = /^(ExponentPushToken|ExpoPushToken)\[[^\]\s]{8,}\]$/.test(token);
    if (hasWhitespace || (provider === PushProvider.EXPO && !expoToken)) {
      throw new BadRequestException("Device token format is invalid");
    }
  }
}
