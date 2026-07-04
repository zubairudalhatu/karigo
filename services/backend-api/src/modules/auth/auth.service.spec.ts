import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, UserRole } from "@prisma/client";
import { hash } from "bcrypt";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  const usersService = {
    createCustomer: jest.fn(),
    findByPhoneForAuth: jest.fn(),
    markLogin: jest.fn(),
    markPhoneVerified: jest.fn(),
    findPublicById: jest.fn()
  };
  const otpService = { issue: jest.fn(), verify: jest.fn() };
  const prisma = {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "refresh-token-id" }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    }
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue("signed-token") };
  const config = {
    get: jest.fn((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "mock" : key === "APP_ENV" ? "development" : fallback
    )
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    otpService as unknown as OtpService,
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
    config as unknown as ConfigService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "mock" : key === "APP_ENV" ? "development" : fallback
    );
  });

  it("registers a customer and exposes the OTP only for the mock provider", async () => {
    usersService.createCustomer.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678"
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.registerCustomer({
      fullName: "Kari Customer",
      phoneNumber: "+2348012345678",
      email: "customer@example.com",
      password: "Password1"
    });

    expect(usersService.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Kari Customer",
        phoneNumber: "+2348012345678",
        passwordHash: expect.any(String)
      })
    );
    expect(result.mockOtp).toBe("123456");
    expect(otpService.issue).toHaveBeenCalledWith("user-1", "+2348012345678");
  });

  it("does not expose the OTP outside the mock provider", async () => {
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "termii" : key === "APP_ENV" ? "development" : fallback
    );
    usersService.createCustomer.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678"
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.registerCustomer({
      fullName: "Kari Customer",
      phoneNumber: "+2348012345678",
      password: "Password1"
    });

    expect(result).not.toHaveProperty("mockOtp");
  });

  it("does not expose the mock OTP in production-like mode", async () => {
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "mock" : key === "APP_ENV" ? "production" : fallback
    );
    usersService.createCustomer.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678"
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.registerCustomer({
      fullName: "Kari Customer",
      phoneNumber: "+2348012345678",
      password: "Password1"
    });

    expect(result).not.toHaveProperty("mockOtp");
  });

  it("does not expose a resent OTP in staging with Termii selected", async () => {
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "termii" : key === "APP_ENV" ? "staging" : fallback
    );
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      phoneNumber: "+2348012345678",
      phoneVerified: false,
      deletedAt: null
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.resendOtp({ phoneNumber: "+2348012345678" });

    expect(result).not.toHaveProperty("mockOtp");
    expect(result.resendAccepted).toBe(true);
  });

  it("logs in an active verified customer and returns a JWT", async () => {
    const passwordHash = await hash("Password1", 4);
    const user = {
      id: "user-1",
      role: UserRole.CUSTOMER,
      passwordHash,
      phoneVerified: true,
      accountStatus: AccountStatus.ACTIVE,
      deletedAt: null
    };
    usersService.findByPhoneForAuth.mockResolvedValue(user);
    usersService.markLogin.mockResolvedValue({ id: user.id, role: user.role });

    const result = await service.login({
      phoneNumber: "+2348012345678",
      password: "Password1"
    });

    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(usersService.markLogin).toHaveBeenCalledWith(user.id);
  });

  it("refreshes a valid refresh token with rotation", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "old-refresh-token-id",
      user: {
        id: "user-1",
        role: UserRole.CUSTOMER,
        deletedAt: null,
        accountStatus: AccountStatus.ACTIVE
      },
      revokedAt: null,
      expiresAt
    });
    usersService.findPublicById.mockResolvedValue({ id: "user-1", role: UserRole.CUSTOMER });

    const result = await service.refreshSession({ refreshToken: "valid-refresh-token-value" });

    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "old-refresh-token-id" },
      data: expect.objectContaining({ revokedAt: expect.any(Date), replacedBy: "refresh-token-id" })
    }));
  });
});
