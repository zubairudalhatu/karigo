import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { IsString, Length, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { VerifyApplicantOtpDto } from "./dto/applicant-onboarding.dto";
import { PartnerOnboardingGuard, PartnerPrincipal, PartnerSessionService } from "./partner-session";
import { AuthService } from "./auth.service";

export class PartnerRefreshDto { @IsString() @Length(20, 512) refreshToken!: string; }
export class PartnerPasswordDto extends LoginDto { @IsString() @Length(43, 43) verificationTicket!: string; }

@Controller("partner-mobile")
export class PartnerAuthController {
  constructor(private readonly sessions: PartnerSessionService, private readonly auth: AuthService) {}
  @Post("session") async login(@Body() body: LoginDto) { return { data: await this.sessions.login(body.phoneNumber, body.password) }; }
  @Post("session/refresh") async refresh(@Body() body: PartnerRefreshDto) { return { data: await this.sessions.refresh(body.refreshToken) }; }
  @Post("verification") async verify(@Body() body: VerifyApplicantOtpDto) { return { data: await this.sessions.verifiedPasswordTicket(body.phoneNumber, body.otp) }; }
  @Post("password") async password(@Body() body: PartnerPasswordDto) { return { data: await this.sessions.setPassword(body.phoneNumber, body.password, body.verificationTicket) }; }
  @Get("me") @UseGuards(PartnerOnboardingGuard)
  async me(@CurrentUser() user: PartnerPrincipal) { return { data: user.partnerScope ? user : await this.auth.me(user.id) }; }
  @Post("session/logout") @UseGuards(PartnerOnboardingGuard)
  async logout(@CurrentUser() user: PartnerPrincipal, @Body() body: Partial<PartnerRefreshDto>, @Req() req: { headers: { authorization?: string } }) {
    await this.sessions.logout(user.id, req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]);
    if (!user.partnerScope && body.refreshToken) await this.auth.logout(user.id, { refreshToken: body.refreshToken });
    return { data: { loggedOut: true } };
  }
}
