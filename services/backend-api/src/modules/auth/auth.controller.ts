import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
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

  @Post("login")
  @ApiOperation({ summary: "Log in with phone number and password" })
  async login(@Body() dto: LoginDto) {
    return {
      message: "Login successful",
      data: await this.authService.login(dto)
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
