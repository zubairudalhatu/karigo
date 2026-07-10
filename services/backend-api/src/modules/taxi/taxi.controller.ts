import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateTaxiDriverApplicationDto } from "./dto/create-taxi-driver-application.dto";
import { CreateTaxiWaitlistDto } from "./dto/create-taxi-waitlist.dto";
import { TaxiApplicationStatusQueryDto } from "./dto/taxi-application-status-query.dto";
import { TaxiService } from "./taxi.service";

@ApiTags("Taxi Readiness")
@Controller("taxi")
export class TaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Post("waitlist")
  @ApiOperation({ summary: "Join the customer Taxi waitlist" })
  async joinWaitlist(@Body() dto: CreateTaxiWaitlistDto) {
    return { message: "Taxi waitlist entry submitted", data: await this.taxi.joinWaitlist(dto) };
  }

  @Post("driver-applications")
  @ApiOperation({ summary: "Submit a Taxi driver readiness application" })
  async submitDriverApplication(@Body() dto: CreateTaxiDriverApplicationDto) {
    return { message: "Taxi driver readiness application submitted", data: await this.taxi.submitDriverApplication(dto) };
  }

  @Get("driver-applications/status")
  @ApiOperation({ summary: "Check Taxi driver readiness application status" })
  async driverApplicationStatus(@Query() query: TaxiApplicationStatusQueryDto) {
    return { message: "Taxi driver readiness application status retrieved", data: await this.taxi.publicApplicationStatus(query) };
  }
}
