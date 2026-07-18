import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, LoginActivityOutcome, Prisma, UserRole, VendorActivationInvitationStatus } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpService } from "./otp.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AccountActivationEmailService } from "./account-activation-email.service";
import { ActivateVendorAccountDto } from "./dto/activate-vendor-account.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ConfirmPasswordResetDto } from "./dto/confirm-password-reset.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { RequestVendorActivationLinkDto } from "./dto/request-vendor-activation-link.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly accountActivationEmail: AccountActivationEmailService,
    private readonly applicationNotifications: ApplicationNotificationsService
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const passwordHash = await hash(dto.password, 12);
    const user = await this.usersService.createCustomer({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      passwordHash,
      referralCode: dto.referralCode
    });
    const verification = await this.otpService.issue(user.id, user.phoneNumber);
    return {
      user,
      otpExpiresAt: verification.expiresAt,
      ...(this.shouldExposeMockOtp() ? { mockOtp: verification.otp } : {})
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    if (!user || user.phoneVerified || user.deletedAt) {
      return { resendAccepted: true };
    }

    const verification = await this.otpService.issue(user.id, user.phoneNumber, { enforceCooldown: true });
    return {
      resendAccepted: true,
      otpExpiresAt: verification.expiresAt,
      ...(this.shouldExposeMockOtp() ? { mockOtp: verification.otp } : {})
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    if (!user) {
      throw new UnauthorizedException("OTP is invalid or expired");
    }

    await this.otpService.verify(user.id, dto.otp);
    const verifiedUser = await this.usersService.markPhoneVerified(user.id);
    await this.sendAccountActivationNotice(verifiedUser);

    return {
      user: verifiedUser,
      ...(await this.issueSession(verifiedUser.id, verifiedUser.role))
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    const passwordMatches = user ? await compare(dto.password, user.passwordHash) : false;

    if (user && passwordMatches && !user.phoneVerified && !user.deletedAt) {
      const verification = await this.otpService.issue(user.id, user.phoneNumber, { enforceCooldown: true });
      await this.recordLoginActivity({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        outcome: LoginActivityOutcome.BLOCKED,
        reason: "Phone verification required; OTP resent"
      });
      return {
        verificationRequired: true as const,
        phoneNumber: user.phoneNumber,
        otpExpiresAt: verification.expiresAt,
        message: "Verify your phone number to finish account setup.",
        ...(this.shouldExposeMockOtp() ? { mockOtp: verification.otp } : {})
      };
    }

    if (
      !user ||
      !passwordMatches ||
      !user.phoneVerified ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      user.deletedAt
    ) {
      await this.recordLoginActivity({
        userId: user?.id,
        phoneNumber: dto.phoneNumber,
        role: user?.role,
        outcome: user && !passwordMatches ? LoginActivityOutcome.FAILED : LoginActivityOutcome.BLOCKED,
        reason: "Invalid login attempt"
      });
      throw new UnauthorizedException("Invalid phone number or password");
    }

    const publicUser = await this.usersService.markLogin(user.id);
    await this.recordLoginActivity({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      outcome: LoginActivityOutcome.SUCCESS,
      reason: "Login successful"
    });
    return {
      user: publicUser,
      ...(await this.issueSession(user.id, user.role))
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    if (!user || user.deletedAt || user.role !== UserRole.CUSTOMER) {
      return { requestAccepted: true };
    }

    const verification = await this.otpService.issue(user.id, user.phoneNumber, { enforceCooldown: true });
    return {
      requestAccepted: true,
      otpExpiresAt: verification.expiresAt,
      ...(this.shouldExposeMockOtp() ? { mockOtp: verification.otp } : {})
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    if (!user || user.deletedAt || user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException("OTP is invalid or expired");
    }

    await this.otpService.verify(user.id, dto.otp);
    const passwordHash = await hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        phoneVerified: true,
        ...(user.accountStatus === AccountStatus.PENDING
          ? { accountStatus: AccountStatus.ACTIVE }
          : {})
      }
    });

    return { passwordReset: true };
  }

  async changeCustomerPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdForAuth(userId);
    const currentPasswordMatches = user ? await compare(dto.currentPassword, user.passwordHash) : false;
    if (
      !user ||
      user.role !== UserRole.CUSTOMER ||
      user.deletedAt ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      !currentPasswordMatches
    ) {
      throw new BadRequestException("Current password is incorrect");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(dto.newPassword, 12) }
    });
    return { passwordChanged: true };
  }

  async activateVendorAccount(dto: ActivateVendorAccountDto) {
    const tokenHash = this.hashRefreshToken(dto.token);
    const activation = await this.prisma.vendorAccountActivation.findUnique({
      where: { tokenHash },
      include: { user: true, vendor: true }
    });

    if (
      !activation ||
      activation.status !== VendorActivationInvitationStatus.PENDING ||
      activation.revokedAt ||
      activation.usedAt ||
      activation.expiresAt.getTime() <= Date.now() ||
      activation.user.role !== UserRole.VENDOR ||
      activation.vendor.deletedAt
    ) {
      throw new UnauthorizedException("Activation link is invalid or expired.");
    }

    const passwordHash = await hash(dto.password, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: activation.userId },
        data: {
          passwordHash,
          accountStatus: AccountStatus.ACTIVE,
          phoneVerified: true
        }
      });
      await tx.vendorAccountActivation.update({
        where: { id: activation.id },
        data: { status: VendorActivationInvitationStatus.USED, usedAt: new Date() }
      });
      await tx.vendorAuditLog.create({
        data: {
          vendorId: activation.vendorId,
          actorUserId: activation.userId,
          action: "vendor.account.activated",
          entityType: "Vendor",
          entityId: activation.vendorId,
          newValue: { activatedBy: "activation_link" }
        }
      });
    });

    const publicUser = await this.usersService.markLogin(activation.userId);
    await this.recordLoginActivity({
      userId: activation.userId,
      phoneNumber: activation.user.phoneNumber,
      role: activation.user.role,
      outcome: LoginActivityOutcome.SUCCESS,
      reason: "Vendor activation login"
    });

    return {
      user: publicUser,
      ...(await this.issueSession(activation.userId, activation.user.role))
    };
  }

  async requestVendorActivationLink(dto: RequestVendorActivationLinkDto) {
    const email = dto.email?.trim().toLowerCase();
    const phoneNumber = dto.phoneNumber?.trim() ? this.normalizePhone(dto.phoneNumber) : undefined;
    if (!email && !phoneNumber) {
      throw new BadRequestException("Enter the approved vendor phone number or email.");
    }

    const vendor = await this.prisma.vendor.findFirst({
      where: {
        deletedAt: null,
        user: {
          is: {
            role: UserRole.VENDOR,
            accountStatus: { not: AccountStatus.ACTIVE },
            OR: [
              ...(phoneNumber ? [{ phoneNumber }] : []),
              ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : [])
            ]
          }
        }
      },
      select: {
        id: true,
        userId: true,
        businessName: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            accountStatus: true
          }
        },
        sourceApplication: {
          select: {
            reference: true,
            contactFullName: true,
            contactPhoneNumber: true,
            contactEmail: true,
            status: true
          }
        }
      }
    });

    if (!vendor) {
      await this.recordVendorActivationRequest(null, phoneNumber ?? email ?? "unknown", "not_eligible");
      return this.vendorActivationRequestAccepted();
    }

    const activationToken = randomBytes(40).toString("base64url");
    const expiresAt = new Date(Date.now() + this.vendorActivationTtlHours() * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.vendorAccountActivation.updateMany({
        where: { vendorId: vendor.id, status: VendorActivationInvitationStatus.PENDING },
        data: { status: VendorActivationInvitationStatus.REVOKED, revokedAt: new Date() }
      });
      await tx.vendorAccountActivation.create({
        data: {
          vendorId: vendor.id,
          userId: vendor.userId,
          tokenHash: this.hashRefreshToken(activationToken),
          expiresAt
        }
      });
      await tx.vendorAuditLog.create({
        data: {
          vendorId: vendor.id,
          actorUserId: vendor.userId,
          action: "vendor.account.activation_link_requested",
          entityType: "Vendor",
          entityId: vendor.id,
          newValue: {
            requestedWith: phoneNumber ? "phone" : "email",
            activationExpiresAt: expiresAt.toISOString()
          } as Prisma.InputJsonValue
        }
      });
    });

    const activationUrl = `${this.vendorDashboardUrl()}/activate?token=${encodeURIComponent(activationToken)}`;
    await this.applicationNotifications.vendorApplicationReviewed({
      reference: vendor.sourceApplication?.reference ?? vendor.id,
      recipientName: vendor.sourceApplication?.contactFullName ?? vendor.user.fullName ?? vendor.businessName,
      phoneNumber: vendor.sourceApplication?.contactPhoneNumber ?? vendor.user.phoneNumber,
      email: vendor.sourceApplication?.contactEmail ?? vendor.user.email,
      status: vendor.sourceApplication?.status ?? "APPROVED",
      activationUrl,
      activationExpiresAt: expiresAt.toISOString()
    });
    await this.recordVendorActivationRequest(vendor.id, phoneNumber ?? email ?? "unknown", "sent");

    return this.vendorActivationRequestAccepted();
  }

  me(userId: string) {
    return this.usersService.findPublicById(userId);
  }

  async refreshSession(dto: RefreshSessionDto) {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() <= Date.now() ||
      existing.user.deletedAt ||
      existing.user.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Your session has expired. Please sign in again.");
    }

    const session = await this.issueSession(existing.user.id, existing.user.role);
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedBy: session.refreshTokenId
      }
    });

    return {
      user: await this.usersService.findPublicById(existing.user.id),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
  }

  async logout(userId: string, dto: LogoutDto) {
    if (dto.refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: this.hashRefreshToken(dto.refreshToken),
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    }

    return { loggedOut: true };
  }

  private signToken(userId: string, role: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, role });
  }

  private async issueSession(userId: string, role: string) {
    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlDays() * 24 * 60 * 60 * 1000);
    const stored = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt
      },
      select: { id: true }
    });

    return {
      accessToken: await this.signToken(userId, role),
      refreshToken,
      refreshTokenId: stored.id
    };
  }

  private refreshTokenTtlDays(): number {
    const configured = Number(this.config.get<string>("REFRESH_TOKEN_EXPIRES_DAYS", "30"));
    return Number.isFinite(configured) && configured > 0 ? configured : 30;
  }

  private shouldExposeMockOtp(): boolean {
    return this.config.get("OTP_PROVIDER", "mock") === "mock" &&
      this.config.get("APP_ENV", "development") !== "production";
  }

  private vendorActivationTtlHours(): number {
    const configured = Number(this.config.get<string>("VENDOR_ACTIVATION_TOKEN_TTL_HOURS", "72"));
    return Number.isFinite(configured) && configured >= 24 ? configured : 72;
  }

  private vendorDashboardUrl() {
    return (this.config.get<string>("VENDOR_DASHBOARD_URL")
      ?? this.config.get<string>("VENDOR_PORTAL_URL")
      ?? "https://vendor.karigo.com.ng").replace(/\/+$/, "");
  }

  private normalizePhone(phoneNumber: string): string {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!NIGERIAN_PHONE_PATTERN.test(normalized)) {
      throw new BadRequestException("Enter a valid Nigerian phone number.");
    }
    return normalized;
  }

  private hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async sendAccountActivationNotice(user: { id: string; fullName: string; email?: string | null }) {
    try {
      await this.accountActivationEmail.sendAccountActivatedEmail({
        userId: user.id,
        fullName: user.fullName,
        email: user.email
      });
    } catch {
      this.logger.warn("Account activation email notification failed");
    }
  }

  private async recordLoginActivity(input: {
    userId?: string;
    phoneNumber: string;
    role?: UserRole;
    outcome: LoginActivityOutcome;
    reason: string;
  }) {
    try {
      await this.prisma.userLoginActivity.create({
        data: {
          userId: input.userId,
          phoneNumberMasked: this.maskPhone(input.phoneNumber),
          role: input.role,
          outcome: input.outcome,
          reason: input.reason
        }
      });
    } catch {
      this.logger.warn("Login activity logging failed");
    }
  }

  private async recordVendorActivationRequest(vendorId: string | null, requestedWith: string, outcome: string) {
    try {
      this.logger.log(`Vendor activation link request vendorId=${vendorId ?? "unmatched"} requestedWith=${this.maskIdentifier(requestedWith)} outcome=${outcome}`);
    } catch {
      this.logger.warn("Vendor activation request logging failed");
    }
  }

  private vendorActivationRequestAccepted() {
    return {
      requestAccepted: true,
      message: "If this approved vendor account is awaiting activation, KariGO has sent a new password setup link to the registered contact."
    };
  }

  private maskPhone(phoneNumber: string) {
    return phoneNumber.length <= 4 ? "****" : `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-4)}`;
  }

  private maskIdentifier(value: string) {
    return value.includes("@") ? value.replace(/^(.{2}).*(@.*)$/u, "$1***$2") : this.maskPhone(value);
  }
}
