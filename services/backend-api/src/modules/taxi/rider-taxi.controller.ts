import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { TaxiDriverAvailabilityDto } from "./dto/taxi-driver-availability.dto";
import { TaxiStartTripDto } from "./dto/taxi-start-trip.dto";
import { TaxiService } from "./taxi.service";

@ApiTags("Rider Taxi Staging")
@ApiBearerAuth()
@Controller("rider/taxi")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
export class RiderTaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get Taxi test driver profile" })
  async profile(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Taxi driver profile retrieved", data: await this.taxi.riderTaxiProfile(user.id) };
  }

  @Patch("availability")
  @ApiOperation({ summary: "Update Taxi test availability" })
  async availability(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiDriverAvailabilityDto) {
    return { message: "Taxi availability updated", data: await this.taxi.updateRiderTaxiAvailability(user.id, dto) };
  }

  @Get("trips/available")
  @ApiOperation({ summary: "List available staging Taxi trips" })
  async available(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Available Taxi trips retrieved", data: await this.taxi.availableTaxiTrips(user.id) };
  }

  @Post("trips/:tripId/accept")
  async accept(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi trip accepted", data: await this.taxi.acceptTaxiTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/arrived-pickup")
  async arrivedPickup(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi pickup arrival recorded", data: await this.taxi.riderArrivedPickup(user.id, tripId) };
  }

  @Post("trips/:tripId/start")
  async start(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiStartTripDto) {
    return { message: "Taxi trip started", data: await this.taxi.riderStartTrip(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/arrived-destination")
  async arrivedDestination(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi destination arrival recorded", data: await this.taxi.riderArrivedDestination(user.id, tripId) };
  }

  @Post("trips/:tripId/complete")
  async complete(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi trip completed", data: await this.taxi.riderCompleteTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/cancel")
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "Taxi trip cancelled", data: await this.taxi.riderCancelTrip(user.id, tripId, dto) };
  }
}
