import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, UserRole, VendorActivationInvitationStatus } from "@prisma/client";
import { hash } from "bcrypt";
import { AuthService } from "./auth.service";
import { AccountActivationEmailService } from "./account-activation-email.service";
import { OtpService } from "./otp.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  const usersService = {
    createCustomer: jest.fn(),
    findByPhoneForAuth: jest.fn(),
    findByIdForAuth: jest.fn(),
    markLogin: jest.fn(),
    markPhoneVerified: jest.fn(),
    findPublicById: jest.fn()
  };
  const otpService = { issue: jest.fn(), verify: jest.fn() };
  const accountActivationEmail = { sendAccountActivatedEmail: jest.fn().mockResolvedValue({ accepted: true }) };
  const applicationNotifications = { vendorApplicationReviewed: jest.fn().mockResolvedValue(undefined) };
  const tx = {
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    vendorAccountActivation: {
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn()
    },
    vendorAuditLog: { create: jest.fn() }
  };
  const prisma = {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "refresh-token-id" }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    userLoginActivity: { create: jest.fn() },
    vendor: { findFirst: jest.fn() },
    vendorAccountActivation: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    vendorAuditLog: { create: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
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
    config as unknown as ConfigService,
    accountActivationEmail as unknown as AccountActivationEmailService,
    applicationNotifications as unknown as ApplicationNotificationsService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === "OTP_PROVIDER" ? "mock" : key === "APP_ENV" ? "development" : fallback
    );
    prisma.user.findUnique.mockResolvedValue(null);
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

  it("sends an account activation email after successful OTP verification", async () => {
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      phoneNumber: "+2348012345678",
      phoneVerified: false,
      deletedAt: null
    });
    usersService.markPhoneVerified.mockResolvedValue({
      id: "user-1",
      fullName: "Kari Customer",
      email: "customer@example.com",
      role: UserRole.CUSTOMER
    });

    const result = await service.verifyOtp({ phoneNumber: "+2348012345678", otp: "123456" });

    expect(otpService.verify).toHaveBeenCalledWith("user-1", "123456");
    expect(accountActivationEmail.sendAccountActivatedEmail).toHaveBeenCalledWith({
      userId: "user-1",
      fullName: "Kari Customer",
      email: "customer@example.com"
    });
    expect(result.accessToken).toBe("signed-token");
  });

  it("does not fail OTP verification if activation email delivery fails", async () => {
    accountActivationEmail.sendAccountActivatedEmail.mockRejectedValueOnce(new Error("email unavailable"));
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      phoneNumber: "+2348012345678",
      phoneVerified: false,
      deletedAt: null
    });
    usersService.markPhoneVerified.mockResolvedValue({
      id: "user-1",
      fullName: "Kari Customer",
      email: "customer@example.com",
      role: UserRole.CUSTOMER
    });

    await expect(service.verifyOtp({ phoneNumber: "+2348012345678", otp: "123456" }))
      .resolves.toHaveProperty("accessToken", "signed-token");
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

  it("creates a vendor applicant account and issues OTP before application details", async () => {
    usersService.findByPhoneForAuth.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "vendor-applicant-1",
      fullName: "Vendor Owner",
      phoneNumber: "+2348012345678",
      email: "owner@example.test",
      role: UserRole.VENDOR,
      accountStatus: AccountStatus.PENDING,
      phoneVerified: false,
      onboardingPasswordSetAt: null
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.createApplicantAccount(UserRole.VENDOR, {
      fullName: "Vendor Owner",
      phoneNumber: "08012345678",
      email: "owner@example.test"
    });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: UserRole.VENDOR,
        accountStatus: AccountStatus.PENDING,
        phoneVerified: false,
        phoneNumber: "+2348012345678"
      })
    }));
    expect(otpService.issue).toHaveBeenCalledWith("vendor-applicant-1", "+2348012345678");
    expect(result).toMatchObject({
      nextStep: "OTP_REQUIRED",
      account: {
        role: UserRole.VENDOR,
        phoneVerified: false,
        passwordCreated: false
      },
      mockOtp: "123456"
    });
  });

  it("verifies a Captain applicant OTP and then creates the onboarding password", async () => {
    usersService.findByPhoneForAuth.mockResolvedValueOnce({
      id: "captain-applicant-1",
      fullName: "Captain User",
      phoneNumber: "+2348012345678",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.PENDING,
      phoneVerified: false,
      onboardingPasswordSetAt: null,
      deletedAt: null
    });
    prisma.user.update.mockResolvedValueOnce({
      id: "captain-applicant-1",
      fullName: "Captain User",
      phoneNumber: "+2348012345678",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.PENDING,
      phoneVerified: true,
      onboardingPasswordSetAt: null
    });

    const verified = await service.verifyApplicantOtp(UserRole.RIDER, {
      phoneNumber: "08012345678",
      otp: "123456"
    });

    expect(otpService.verify).toHaveBeenCalledWith("captain-applicant-1", "123456");
    expect(verified.nextStep).toBe("PASSWORD_REQUIRED");

    usersService.findByPhoneForAuth.mockResolvedValueOnce({
      id: "captain-applicant-1",
      fullName: "Captain User",
      phoneNumber: "+2348012345678",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.PENDING,
      phoneVerified: true,
      onboardingPasswordSetAt: null,
      deletedAt: null
    });
    prisma.user.update.mockResolvedValueOnce({
      id: "captain-applicant-1",
      fullName: "Captain User",
      phoneNumber: "+2348012345678",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.PENDING,
      phoneVerified: true,
      onboardingPasswordSetAt: new Date("2030-01-01")
    });

    const password = await service.createApplicantPassword(UserRole.RIDER, {
      phoneNumber: "08012345678",
      password: "StrongPass123"
    });

    expect(prisma.user.update).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "captain-applicant-1" },
      data: expect.objectContaining({
        onboardingPasswordSetAt: expect.any(Date),
        accountStatus: AccountStatus.PENDING
      })
    }));
    expect(password).toMatchObject({
      nextStep: "READY_FOR_APPLICATION",
      account: { phoneVerified: true, passwordCreated: true }
    });
  });

  it("logs in an active verified customer and returns a JWT", async () => {
    const passwordHash = await hash("Password1", 4);
    const user = {
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678",
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

    if ("verificationRequired" in result) {
      throw new Error("Expected verified login to return a session");
    }
    expect(result.accessToken).toBe("signed-token");
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(usersService.markLogin).toHaveBeenCalledWith(user.id);
    expect(prisma.userLoginActivity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: user.id, outcome: "SUCCESS" })
    }));
  });

  it("resends OTP and returns verification instructions for registered unverified login with a valid password", async () => {
    const passwordHash = await hash("Password1", 4);
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678",
      passwordHash,
      phoneVerified: false,
      accountStatus: AccountStatus.PENDING,
      deletedAt: null
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.login({
      phoneNumber: "+2348012345678",
      password: "Password1"
    });

    expect(result).toMatchObject({
      verificationRequired: true,
      phoneNumber: "+2348012345678",
      mockOtp: "123456"
    });
    expect(otpService.issue).toHaveBeenCalledWith("user-1", "+2348012345678", { enforceCooldown: true });
    expect(usersService.markLogin).not.toHaveBeenCalled();
  });

  it("does not resend OTP for an unverified account when the password is wrong", async () => {
    const passwordHash = await hash("Password1", 4);
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678",
      passwordHash,
      phoneVerified: false,
      accountStatus: AccountStatus.PENDING,
      deletedAt: null
    });

    await expect(service.login({
      phoneNumber: "+2348012345678",
      password: "WrongPassword"
    })).rejects.toThrow("Invalid phone number or password");
    expect(otpService.issue).not.toHaveBeenCalled();
  });

  it("requests customer password reset OTP without exposing account existence", async () => {
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678",
      deletedAt: null
    });
    otpService.issue.mockResolvedValue({ otp: "123456", expiresAt: new Date("2030-01-01") });

    const result = await service.requestPasswordReset({ phoneNumber: "+2348012345678" });

    expect(result).toMatchObject({ requestAccepted: true, mockOtp: "123456" });
    expect(otpService.issue).toHaveBeenCalledWith("user-1", "+2348012345678", { enforceCooldown: true });

    usersService.findByPhoneForAuth.mockResolvedValueOnce(null);
    const unmatched = await service.requestPasswordReset({ phoneNumber: "+2348099999999" });
    expect(unmatched).toEqual({ requestAccepted: true });
  });

  it("confirms customer password reset and activates an unverified pending account", async () => {
    usersService.findByPhoneForAuth.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      phoneNumber: "+2348012345678",
      accountStatus: AccountStatus.PENDING,
      deletedAt: null
    });

    const result = await service.confirmPasswordReset({
      phoneNumber: "+2348012345678",
      otp: "123456",
      newPassword: "NewPassword1"
    });

    expect(result).toEqual({ passwordReset: true });
    expect(otpService.verify).toHaveBeenCalledWith("user-1", "123456");
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        phoneVerified: true,
        accountStatus: AccountStatus.ACTIVE
      })
    }));
  });

  it("changes customer password only after the current password matches", async () => {
    const passwordHash = await hash("OldPassword1", 4);
    usersService.findByIdForAuth.mockResolvedValue({
      id: "user-1",
      role: UserRole.CUSTOMER,
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
      deletedAt: null
    });

    await expect(service.changeCustomerPassword("user-1", {
      currentPassword: "WrongPassword1",
      newPassword: "NewPassword1"
    })).rejects.toThrow("Current password is incorrect");

    const result = await service.changeCustomerPassword("user-1", {
      currentPassword: "OldPassword1",
      newPassword: "NewPassword1"
    });

    expect(result).toEqual({ passwordChanged: true });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" },
      data: expect.objectContaining({ passwordHash: expect.any(String) })
    }));
  });

  it("activates a vendor account with a valid setup token", async () => {
    prisma.vendorAccountActivation.findUnique.mockResolvedValue({
      id: "activation-1",
      vendorId: "vendor-1",
      userId: "vendor-user-1",
      status: VendorActivationInvitationStatus.PENDING,
      revokedAt: null,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "vendor-user-1", role: UserRole.VENDOR, phoneNumber: "+2348012345678" },
      vendor: { id: "vendor-1", deletedAt: null }
    });
    usersService.markLogin.mockResolvedValue({ id: "vendor-user-1", role: UserRole.VENDOR });

    const result = await service.activateVendorAccount({ token: "activation-token-value-1234567890", password: "Password1" });

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "vendor-user-1" },
      data: expect.objectContaining({ accountStatus: AccountStatus.ACTIVE, phoneVerified: true })
    }));
    expect(tx.vendorAccountActivation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "activation-1" },
      data: expect.objectContaining({ status: VendorActivationInvitationStatus.USED })
    }));
    expect(result.accessToken).toBe("signed-token");
  });

  it("requests a new vendor activation link without exposing the plaintext token", async () => {
    prisma.vendor.findFirst.mockResolvedValue({
      id: "vendor-1",
      userId: "vendor-user-1",
      businessName: "Kari Vendor",
      user: {
        id: "vendor-user-1",
        fullName: "Kari Vendor Owner",
        phoneNumber: "+2348012345678",
        email: "vendor@example.test",
        accountStatus: AccountStatus.PENDING
      },
      sourceApplication: {
        reference: "KGO-APP-2026-ABCDEF",
        contactFullName: "Kari Vendor Owner",
        contactPhoneNumber: "+2348012345678",
        contactEmail: "vendor@example.test",
        status: "APPROVED"
      }
    });

    const result = await service.requestVendorActivationLink({ phoneNumber: "08012345678" });

    expect(result).toMatchObject({ requestAccepted: true });
    expect(JSON.stringify(result)).not.toContain("token=");
    expect(tx.vendorAccountActivation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { vendorId: "vendor-1", status: VendorActivationInvitationStatus.PENDING }
    }));
    expect(tx.vendorAccountActivation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "vendor-1",
        userId: "vendor-user-1",
        expiresAt: expect.any(Date)
      })
    }));
    expect(applicationNotifications.vendorApplicationReviewed).toHaveBeenCalledWith(expect.objectContaining({
      reference: "KGO-APP-2026-ABCDEF",
      activationUrl: expect.stringContaining("/activate?token=")
    }));
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
