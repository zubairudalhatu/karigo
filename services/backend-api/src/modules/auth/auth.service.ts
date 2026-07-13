import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpService } from "./otp.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AccountActivationEmailService } from "./account-activation-email.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly accountActivationEmail: AccountActivationEmailService
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
    const includeMockOtp =
      this.config.get("OTP_PROVIDER", "mock") === "mock" &&
      this.config.get("APP_ENV", "development") !== "production";

    return {
      user,
      otpExpiresAt: verification.expiresAt,
      ...(includeMockOtp ? { mockOtp: verification.otp } : {})
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.usersService.findByPhoneForAuth(dto.phoneNumber);
    if (!user || user.phoneVerified || user.deletedAt) {
      return { resendAccepted: true };
    }

    const verification = await this.otpService.issue(user.id, user.phoneNumber, { enforceCooldown: true });
    const includeMockOtp =
      this.config.get("OTP_PROVIDER", "mock") === "mock" &&
      this.config.get("APP_ENV", "development") !== "production";

    return {
      resendAccepted: true,
      otpExpiresAt: verification.expiresAt,
      ...(includeMockOtp ? { mockOtp: verification.otp } : {})
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

    if (
      !user ||
      !passwordMatches ||
      !user.phoneVerified ||
      user.accountStatus !== AccountStatus.ACTIVE ||
      user.deletedAt
    ) {
      throw new UnauthorizedException("Invalid phone number or password");
    }

    const publicUser = await this.usersService.markLogin(user.id);
    return {
      user: publicUser,
      ...(await this.issueSession(user.id, user.role))
    };
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
}
