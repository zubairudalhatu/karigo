import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateTaxiTripDto } from "./dto/create-taxi-trip.dto";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { TaxiFareEstimateDto } from "./dto/taxi-fare-estimate.dto";
import { TaxiService } from "./taxi.service";

@ApiTags("Customer KariGO Rides")
@ApiBearerAuth()
@Controller("customer/taxi")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerTaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Post("fare-estimate")
  @ApiOperation({ summary: "Create a controlled-pilot KariGO Rides fare estimate" })
  async fareEstimate(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiFareEstimateDto) {
    return { message: "KariGO Rides fare estimate calculated", data: this.taxi.customerFareEstimate(user.id, dto) };
  }

  @Post("trips")
  @ApiOperation({ summary: "Create a controlled-pilot KariGO Rides trip request" })
  async createTrip(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxiTripDto) {
    return { message: "KariGO Rides request submitted", data: await this.taxi.createCustomerTrip(user.id, dto) };
  }

  @Get("trips")
  @ApiOperation({ summary: "List my controlled-pilot KariGO Rides trips" })
  async trips(@CurrentUser() user: AuthenticatedUser) {
    return { message: "KariGO Rides trips retrieved", data: await this.taxi.customerTrips(user.id) };
  }

  @Get("trips/:tripId")
  @ApiOperation({ summary: "Get my controlled-pilot KariGO Rides trip" })
  async trip(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "KariGO Rides trip retrieved", data: await this.taxi.customerTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel my controlled-pilot KariGO Rides trip" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "KariGO Rides trip cancelled", data: await this.taxi.customerCancelTrip(user.id, tripId, dto) };
  }
}
