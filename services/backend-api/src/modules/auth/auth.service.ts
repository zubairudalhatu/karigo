import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { LoginDto } from "./dto/login.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpService } from "./otp.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const passwordHash = await hash(dto.password, 12);
    const user = await this.usersService.createCustomer({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      passwordHash
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

    return {
      user: verifiedUser,
      accessToken: await this.signToken(verifiedUser.id, verifiedUser.role)
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
      accessToken: await this.signToken(user.id, user.role)
    };
  }

  me(userId: string) {
    return this.usersService.findPublicById(userId);
  }

  private signToken(userId: string, role: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, role });
  }
}
