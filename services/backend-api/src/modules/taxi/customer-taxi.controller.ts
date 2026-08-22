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
import { CreateRideMessageDto, ListRideMessagesQueryDto, MarkRideMessagesReadDto } from "./dto/ride-message.dto";
import { EndRideCallDto } from "./dto/ride-call.dto";
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
  @Get("trips/:tripId/receipt")
  @ApiOperation({ summary: "Get the permanent receipt for my completed KariGO Ride" })
  async receipt(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "KariGO Ride receipt retrieved", data: await this.taxi.customerRideReceipt(user.id, tripId) };
  }


  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel my KariGO Rides trip" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "KariGO Rides trip cancelled", data: await this.taxi.customerCancelTrip(user.id, tripId, dto) };
  }
  @Get("trips/:tripId/messages")
  @ApiOperation({ summary: "List my Ride conversation" })
  async messages(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Query() query: ListRideMessagesQueryDto) {
    return { message: "Ride conversation retrieved", data: await this.taxi.customerRideMessages(user.id, tripId, query) };
  }

  @Post("trips/:tripId/messages")
  @ApiOperation({ summary: "Send a message to my assigned Ride Captain" })
  async sendMessage(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: CreateRideMessageDto) {
    return { message: "Ride message sent", data: await this.taxi.customerSendRideMessage(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/messages/read")
  @ApiOperation({ summary: "Mark Ride messages as read" })
  async markMessagesRead(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: MarkRideMessagesReadDto) {
    return { message: "Ride messages marked read", data: await this.taxi.customerMarkRideMessagesRead(user.id, tripId, dto) };
  }

  @Get("trips/:tripId/contact-options")
  @ApiOperation({ summary: "Get controlled Ride Captain contact options" })
  async contactOptions(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride contact options retrieved", data: await this.taxi.customerRideContactOptions(user.id, tripId) };
  }

  @Post("trips/:tripId/call-session")
  @ApiOperation({ summary: "Request a provider-backed in-app Ride call session" })
  async callSession(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride call readiness retrieved", data: await this.taxi.customerRideCallSession(user.id, tripId) };
  }

  @Get("trips/:tripId/call-session/active")
  async activeCallSession(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Active Ride call session retrieved", data: await this.taxi.customerActiveRideCallSession(user.id, tripId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/accept")
  async acceptCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call accepted", data: await this.taxi.customerAcceptRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/connected")
  async connectCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call connected", data: await this.taxi.customerConnectRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/decline")
  async declineCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call declined", data: await this.taxi.customerDeclineRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/end")
  async endCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string, @Body() dto: EndRideCallDto) {
    return { message: "Ride call ended", data: await this.taxi.customerEndRideCall(user.id, tripId, sessionId, dto.reason) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/token/renew")
  async renewCallToken(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call token renewed", data: await this.taxi.customerRenewRideCallToken(user.id, tripId, sessionId) };
  }
}
