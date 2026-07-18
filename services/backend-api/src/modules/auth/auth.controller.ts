import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AuthService } from "./auth.service";
import { ActivateVendorAccountDto } from "./dto/activate-vendor-account.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ConfirmPasswordResetDto } from "./dto/confirm-password-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { RequestVendorActivationLinkDto } from "./dto/request-vendor-activation-link.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("customer/register")
  @ApiOperation({ summary: "Register a customer and issue a phone OTP" })
  async registerCustomer(@Body() dto: RegisterCustomerDto) {
    return {
      message: "Customer registered. Verify the phone number to activate the account.",
      data: await this.authService.registerCustomer(dto)
    };
  }

  @Post("verify-otp")
  @ApiOperation({ summary: "Verify a phone OTP" })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return {
      message: "Phone number verified",
      data: await this.authService.verifyOtp(dto)
    };
  }

  @Post("resend-otp")
  @ApiOperation({ summary: "Resend a phone OTP subject to cooldown controls" })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return {
      message: "If the phone number is eligible, a new OTP has been sent.",
      data: await this.authService.resendOtp(dto)
    };
  }

  @Post("password-reset/request")
  @ApiOperation({ summary: "Request an OTP for customer password reset" })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return {
      message: "If the customer account is eligible, a password reset OTP has been sent.",
      data: await this.authService.requestPasswordReset(dto)
    };
  }

  @Post("password-reset/confirm")
  @ApiOperation({ summary: "Confirm a customer password reset with OTP" })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return {
      message: "Password reset completed",
      data: await this.authService.confirmPasswordReset(dto)
    };
  }

  @Post("login")
  @ApiOperation({ summary: "Log in with phone number and password" })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return {
      message: "verificationRequired" in data ? "Phone verification required" : "Login successful",
      data
    };
  }

  @Post("vendor/activate")
  @ApiOperation({ summary: "Activate an approved vendor account with a one-time setup token" })
  async activateVendorAccount(@Body() dto: ActivateVendorAccountDto) {
    return {
      message: "Vendor account activated",
      data: await this.authService.activateVendorAccount(dto)
    };
  }

  @Post("vendor/activation-link/request")
  @ApiOperation({ summary: "Request a new approved-vendor activation link" })
  async requestVendorActivationLink(@Body() dto: RequestVendorActivationLinkDto) {
    return {
      message: "If the approved vendor account is eligible, a new activation link has been sent.",
      data: await this.authService.requestVendorActivationLink(dto)
    };
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh an authenticated session with a valid refresh token" })
  async refresh(@Body() dto: RefreshSessionDto) {
    return {
      message: "Session refreshed",
      data: await this.authService.refreshSession(dto)
    };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Log out and revoke the current refresh token when supplied" })
  async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto) {
    return {
      message: "Logged out",
      data: await this.authService.logout(user.id, dto)
    };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the authenticated customer password" })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return {
      message: "Password changed",
      data: await this.authService.changeCustomerPassword(user.id, dto)
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: "Authenticated user retrieved",
      data: await this.authService.me(user.id)
    };
  }
}
