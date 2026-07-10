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

@ApiTags("Customer Taxi Staging")
@ApiBearerAuth()
@Controller("customer/taxi")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerTaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Post("fare-estimate")
  @ApiOperation({ summary: "Create a staging-only Taxi fare estimate" })
  async fareEstimate(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiFareEstimateDto) {
    return { message: "Taxi fare estimate calculated", data: this.taxi.customerFareEstimate(user.id, dto) };
  }

  @Post("trips")
  @ApiOperation({ summary: "Create a staging-only Taxi test trip" })
  async createTrip(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxiTripDto) {
    return { message: "Test Taxi Trip requested", data: await this.taxi.createCustomerTrip(user.id, dto) };
  }

  @Get("trips")
  @ApiOperation({ summary: "List my staging Taxi test trips" })
  async trips(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Taxi trips retrieved", data: await this.taxi.customerTrips(user.id) };
  }

  @Get("trips/:tripId")
  @ApiOperation({ summary: "Get my staging Taxi test trip" })
  async trip(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi trip retrieved", data: await this.taxi.customerTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel my staging Taxi test trip" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "Taxi trip cancelled", data: await this.taxi.customerCancelTrip(user.id, tripId, dto) };
  }
}
