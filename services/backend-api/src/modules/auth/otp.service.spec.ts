import { BadRequestException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hash } from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { OtpService } from "./otp.service";
import { OtpProviderRegistry } from "./providers/otp-provider.registry";

describe("OtpService", () => {
  const prisma = {
    otpVerification: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  };
  const config = {
    get: jest.fn((key: string, fallback: unknown) => ({
      OTP_LENGTH: 6,
      OTP_EXPIRY_MINUTES: 10,
      OTP_MAX_ATTEMPTS: 5,
      OTP_RESEND_COOLDOWN_SECONDS: 60
    }[key] ?? fallback))
  };
  const provider = { name: "mock", sendOtp: jest.fn().mockResolvedValue({ accepted: true }) };
  const providers = { active: jest.fn(() => provider) };
  const service = new OtpService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    providers as unknown as OtpProviderRegistry
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.otpVerification.findFirst.mockReset();
    prisma.otpVerification.updateMany.mockResolvedValue({ count: 0 });
    prisma.otpVerification.create.mockResolvedValue({ id: "otp-1" });
    prisma.otpVerification.update.mockResolvedValue({});
  });

  it("issues a hashed OTP through the selected provider", async () => {
    const result = await service.issue("user-1", "+2348012345678");

    expect(prisma.otpVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        codeHash: expect.not.stringMatching(/^\d{6}$/)
      })
    });
    expect(provider.sendOtp).toHaveBeenCalledWith(expect.objectContaining({
      phoneNumber: "+2348012345678",
      otpCode: expect.stringMatching(/^\d{6}$/)
    }));
    expect(result.provider).toBe("mock");
  });

  it("enforces resend cooldown", async () => {
    prisma.otpVerification.findFirst.mockResolvedValue({ createdAt: new Date() });

    await expect(service.issue("user-1", "+2348012345678", { enforceCooldown: true }))
      .rejects.toHaveProperty("status", HttpStatus.TOO_MANY_REQUESTS);
    expect(provider.sendOtp).not.toHaveBeenCalled();
  });

  it("invalidates a newly created OTP when provider delivery fails", async () => {
    provider.sendOtp.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(service.issue("user-1", "+2348012345678")).rejects.toThrow("provider unavailable");
    expect(prisma.otpVerification.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data: { verifiedAt: expect.any(Date) }
    });
  });

  it("verifies a valid unexpired OTP", async () => {
    prisma.otpVerification.findFirst.mockResolvedValue({
      id: "otp-1",
      codeHash: await hash("123456", 4),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000)
    });

    await service.verify("user-1", "123456");
    expect(prisma.otpVerification.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data: { verifiedAt: expect.any(Date) }
    });
  });

  it("increments attempts for an invalid OTP", async () => {
    prisma.otpVerification.findFirst.mockResolvedValue({
      id: "otp-1",
      codeHash: await hash("123456", 4),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000)
    });

    await expect(service.verify("user-1", "654321")).rejects.toThrow("OTP is invalid or expired");
    expect(prisma.otpVerification.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data: { attempts: { increment: 1 } }
    });
  });

  it("rejects expired OTPs and attempt-limit OTPs", async () => {
    prisma.otpVerification.findFirst.mockResolvedValueOnce({
      expiresAt: new Date(Date.now() - 1),
      attempts: 0
    });
    await expect(service.verify("user-1", "123456")).rejects.toBeInstanceOf(BadRequestException);

    prisma.otpVerification.findFirst.mockResolvedValueOnce({
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 5
    });
    await expect(service.verify("user-1", "123456")).rejects.toThrow("OTP attempt limit reached");
  });
});
