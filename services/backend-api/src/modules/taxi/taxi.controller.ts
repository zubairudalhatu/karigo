import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateTaxiDriverApplicationDto } from "./dto/create-taxi-driver-application.dto";
import { CreateTaxiWaitlistDto } from "./dto/create-taxi-waitlist.dto";
import { TaxiApplicationStatusQueryDto } from "./dto/taxi-application-status-query.dto";
import { TaxiFareEstimateDto } from "./dto/taxi-fare-estimate.dto";
import { TaxiService } from "./taxi.service";

@ApiTags("KariGO Rides")
@Controller("taxi")
export class TaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Post("waitlist")
  @ApiOperation({ summary: "Join the customer KariGO Rides waitlist" })
  async joinWaitlist(@Body() dto: CreateTaxiWaitlistDto) {
    return { message: "KariGO Rides waitlist entry submitted", data: await this.taxi.joinWaitlist(dto) };
  }

  @Post("driver-applications")
  @ApiOperation({ summary: "Submit a Ride Captain application" })
  async submitDriverApplication(@Body() dto: CreateTaxiDriverApplicationDto) {
    return { message: "Ride Captain application submitted", data: await this.taxi.submitDriverApplication(dto) };
  }

  @Get("driver-applications/status")
  @ApiOperation({ summary: "Check Ride Captain application status" })
  async driverApplicationStatus(@Query() query: TaxiApplicationStatusQueryDto) {
    return { message: "Ride Captain application status retrieved", data: await this.taxi.publicApplicationStatus(query) };
  }

  @Post("driver-applications/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a Ride Captain readiness application for the authenticated KariGO account" })
  async submitDriverApplicationForCurrentUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxiDriverApplicationDto) {
    return { message: "Ride Captain application submitted", data: await this.taxi.submitDriverApplication(dto, user.id) };
  }

  @Get("driver-applications/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check the authenticated user's Ride Captain readiness application status" })
  async currentUserDriverApplicationStatus(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Ride Captain application status retrieved", data: await this.taxi.currentUserApplicationStatus(user.id) };
  }

  @Post("fare-estimate")
  @ApiOperation({ summary: "Create a public KariGO Rides fare estimate when controlled pilot is enabled" })
  async fareEstimate(@Body() dto: TaxiFareEstimateDto) {
    return { message: "KariGO Rides fare estimate calculated", data: this.taxi.fareEstimate(dto) };
  }
}
