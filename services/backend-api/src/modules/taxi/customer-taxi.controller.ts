import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
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
import { TaxiPlaceAutocompleteQueryDto } from "./dto/taxi-place-autocomplete-query.dto";
import { TaxiPlaceDetailsQueryDto } from "./dto/taxi-place-details-query.dto";
import { TaxiRoutePreviewDto } from "./dto/taxi-route-preview.dto";
import { TaxiMapsService } from "./taxi-maps.service";
import { TaxiService } from "./taxi.service";

@ApiTags("Customer KariGO Rides")
@ApiBearerAuth()
@Controller("customer/taxi")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerTaxiController {
  constructor(
    private readonly taxi: TaxiService,
    private readonly maps: TaxiMapsService
  ) {}

  @Get("ride-categories")
  @ApiOperation({ summary: "List KariGO Rides categories available for booking" })
  async rideCategories(@Query("city") city?: string) {
    return { message: "KariGO Rides categories retrieved", data: this.taxi.rideCategories(city) };
  }

  @Get("places/autocomplete")
  @ApiOperation({ summary: "Search Google Places through the secure KariGO Rides backend proxy" })
  async placeAutocomplete(@CurrentUser() user: AuthenticatedUser, @Query() query: TaxiPlaceAutocompleteQueryDto) {
    return { message: "KariGO Rides place predictions retrieved", data: await this.maps.autocomplete(user.id, query) };
  }

  @Get("places/details/:placeId")
  @ApiOperation({ summary: "Resolve a selected Google Place through the secure KariGO Rides backend proxy" })
  async placeDetails(@CurrentUser() user: AuthenticatedUser, @Param("placeId") placeId: string, @Query() query: TaxiPlaceDetailsQueryDto) {
    return { message: "KariGO Rides place details retrieved", data: await this.maps.placeDetails(user.id, placeId, query) };
  }

  @Post("routes/preview")
  @ApiOperation({ summary: "Compute a traffic-aware road route preview for KariGO Rides" })
  async routePreview(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiRoutePreviewDto) {
    return { message: "KariGO Rides route preview calculated", data: await this.maps.routePreview(user.id, dto) };
  }

  @Post("fare-estimate")
  @ApiOperation({ summary: "Create a KariGO Rides fare estimate" })
  async fareEstimate(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiFareEstimateDto) {
    return { message: "KariGO Rides fare estimate calculated", data: this.taxi.customerFareEstimate(user.id, dto) };
  }

  @Post("trips")
  @ApiOperation({ summary: "Create a KariGO Rides trip request" })
  async createTrip(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxiTripDto) {
    return { message: "KariGO Rides request submitted", data: await this.taxi.createCustomerTrip(user.id, dto) };
  }

  @Get("trips")
  @ApiOperation({ summary: "List my KariGO Rides trips" })
  async trips(@CurrentUser() user: AuthenticatedUser) {
    return { message: "KariGO Rides trips retrieved", data: await this.taxi.customerTrips(user.id) };
  }

  @Get("trips/:tripId")
  @ApiOperation({ summary: "Get my KariGO Rides trip" })
  async trip(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "KariGO Rides trip retrieved", data: await this.taxi.customerTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel my KariGO Rides trip" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "KariGO Rides trip cancelled", data: await this.taxi.customerCancelTrip(user.id, tripId, dto) };
  }
}
