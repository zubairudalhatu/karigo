import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { TaxiDriverAvailabilityDto } from "./dto/taxi-driver-availability.dto";
import { CreateRideMessageDto, ListRideMessagesQueryDto, MarkRideMessagesReadDto } from "./dto/ride-message.dto";
import { EndRideCallDto } from "./dto/ride-call.dto";
import { TaxiStartTripDto } from "./dto/taxi-start-trip.dto";
import { RideLocationEvidenceDto } from "./dto/ride-location-evidence.dto";
import { TaxiService } from "./taxi.service";

@ApiTags("Captain Ride Operations")
@ApiBearerAuth()
@Controller("rider/taxi")
@UseGuards(JwtAuthGuard)
export class RiderTaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get production Ride Captain profile" })
  async profile(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Ride Captain profile retrieved", data: await this.taxi.riderTaxiProfile(user.id) };
  }

  @Patch("availability")
  @ApiOperation({ summary: "Update production Ride Captain availability" })
  async availability(@CurrentUser() user: AuthenticatedUser, @Body() dto: TaxiDriverAvailabilityDto) {
    return { message: "Ride Captain availability updated", data: await this.taxi.updateRiderTaxiAvailability(user.id, dto) };
  }

  @Get("trips/available")
  @ApiOperation({ summary: "List assigned KariGO Ride trips" })
  async available(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Assigned ride trips retrieved", data: await this.taxi.availableTaxiTrips(user.id) };
  }
  @Get("trips")
  @ApiOperation({ summary: "List the Captain's KariGO Ride work history" })
  async trips(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Ride work history retrieved", data: await this.taxi.riderTaxiTrips(user.id) };
  }


  @Get("trips/:tripId/messages")
  @ApiOperation({ summary: "List the assigned Ride conversation" })
  async messages(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Query() query: ListRideMessagesQueryDto) {
    return { message: "Ride conversation retrieved", data: await this.taxi.riderRideMessages(user.id, tripId, query) };
  }

  @Post("trips/:tripId/messages")
  async sendMessage(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: CreateRideMessageDto) {
    return { message: "Ride message sent", data: await this.taxi.riderSendRideMessage(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/messages/read")
  async markMessagesRead(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: MarkRideMessagesReadDto) {
    return { message: "Ride messages marked read", data: await this.taxi.riderMarkRideMessagesRead(user.id, tripId, dto) };
  }

  @Get("trips/:tripId/contact-options")
  @ApiOperation({ summary: "Get controlled Customer contact options" })
  async contactOptions(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride contact options retrieved", data: await this.taxi.riderRideContactOptions(user.id, tripId) };
  }

  @Post("trips/:tripId/call-session")
  @ApiOperation({ summary: "Request a provider-backed in-app Ride call session" })
  async callSession(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride call readiness retrieved", data: await this.taxi.riderRideCallSession(user.id, tripId) };
  }

  @Get("trips/:tripId/call-session/active")
  async activeCallSession(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Active Ride call session retrieved", data: await this.taxi.riderActiveRideCallSession(user.id, tripId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/accept")
  async acceptCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call accepted", data: await this.taxi.riderAcceptRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/connected")
  async connectCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call connected", data: await this.taxi.riderConnectRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/decline")
  async declineCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call declined", data: await this.taxi.riderDeclineRideCall(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/end")
  async endCall(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string, @Body() dto: EndRideCallDto) {
    return { message: "Ride call ended", data: await this.taxi.riderEndRideCall(user.id, tripId, sessionId, dto.reason) };
  }

  @Post("trips/:tripId/call-sessions/:sessionId/token/renew")
  async renewCallToken(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Param("sessionId", ParseUUIDPipe) sessionId: string) {
    return { message: "Ride call token renewed", data: await this.taxi.riderRenewRideCallToken(user.id, tripId, sessionId) };
  }

  @Post("trips/:tripId/accept")
  async accept(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride trip accepted", data: await this.taxi.acceptTaxiTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/decline")
  async decline(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "Ride assignment declined", data: await this.taxi.declineTaxiTrip(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/arrived-pickup")
  async arrivedPickup(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: RideLocationEvidenceDto) {
    return { message: "Ride pickup arrival recorded", data: await this.taxi.riderArrivedPickup(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/start")
  async start(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiStartTripDto) {
    return { message: "Ride trip started", data: await this.taxi.riderStartTrip(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/arrived-destination")
  async arrivedDestination(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: RideLocationEvidenceDto) {
    return { message: "Ride destination arrival recorded", data: await this.taxi.riderArrivedDestination(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/complete")
  async complete(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride trip completed", data: await this.taxi.riderCompleteTrip(user.id, tripId) };
  }

  @Post("trips/:tripId/cancel")
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "Ride trip cancelled", data: await this.taxi.riderCancelTrip(user.id, tripId, dto) };
  }
}
