import { AppSurface, DevicePlatform, PushProvider } from "@prisma/client";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DeviceTokensService } from "./device-tokens.service";

describe("DeviceTokensService", () => {
  const prisma = {
    deviceToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    }
  };
  const service = new DeviceTokensService(prisma as unknown as PrismaService);
  const dto = {
    token: "ExponentPushToken[development-token]",
    platform: DevicePlatform.ANDROID,
    provider: PushProvider.EXPO,
    appSurface: AppSurface.CUSTOMER_APP
  };

  beforeEach(() => jest.clearAllMocks());

  it("registers a token without returning its secret value", async () => {
    prisma.deviceToken.findUnique.mockResolvedValue(null);
    prisma.deviceToken.create.mockImplementation(({ data }) => ({ id: "token-1", ...data }));

    await service.register("user-1", UserRole.CUSTOMER, dto);

    expect(prisma.deviceToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user-1", token: dto.token }),
      select: expect.not.objectContaining({ token: true, deviceId: true })
    }));
  });

  it("does not allow another user to claim an existing token", async () => {
    prisma.deviceToken.findUnique.mockResolvedValue({ id: "token-1", userId: "user-2" });
    await expect(service.register("user-1", UserRole.CUSTOMER, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("does not allow a user to register a token for another app surface", async () => {
    await expect(service.register("user-1", UserRole.CUSTOMER, {
      ...dto,
      appSurface: AppSurface.RIDER_APP
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.deviceToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects malformed Expo tokens", async () => {
    await expect(service.register("user-1", UserRole.CUSTOMER, {
      ...dto,
      token: "not-an-expo-token"
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("only deactivates the authenticated user's token", async () => {
    prisma.deviceToken.findFirst.mockResolvedValue(null);
    await expect(service.deactivate("user-1", "token-2")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.deviceToken.findFirst).toHaveBeenCalledWith({
      where: { id: "token-2", userId: "user-1", isActive: true }
    });
  });
});
