import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AdminAssignTaxiDriverDto } from "./dto/admin-assign-taxi-driver.dto";
import { UpdateTaxiDriverProfileStatusDto } from "./dto/admin-taxi-profile.dto";
import { ListTaxiDriverApplicationsQueryDto, ListTaxiWaitlistQueryDto } from "./dto/list-taxi-query.dto";
import { ReviewTaxiDriverApplicationDto } from "./dto/review-taxi-application.dto";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { UpdateTaxiWaitlistStatusDto } from "./dto/update-taxi-waitlist-status.dto";
import { TaxiService } from "./taxi.service";

const TAXI_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.RIDER_MANAGER,
  AdminRole.SUPPORT_AGENT
];

@ApiTags("Admin Taxi Readiness")
@ApiBearerAuth()
@Controller("admin/taxi")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...TAXI_ADMINS)
export class AdminTaxiController {
  constructor(private readonly taxi: TaxiService) {}

  @Get("driver-applications")
  @ApiOperation({ summary: "List Taxi driver readiness applications" })
  async driverApplications(@Query() query: ListTaxiDriverApplicationsQueryDto) {
    return { message: "Taxi driver applications retrieved", data: await this.taxi.listDriverApplications(query) };
  }

  @Get("driver-applications/:applicationId")
  @ApiOperation({ summary: "Get Taxi driver readiness application detail" })
  async driverApplication(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Taxi driver application retrieved", data: await this.taxi.driverApplicationDetail(applicationId) };
  }

  @Patch("driver-applications/:applicationId/review")
  @ApiOperation({ summary: "Review a Taxi driver readiness application" })
  async reviewDriverApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: ReviewTaxiDriverApplicationDto
  ) {
    return { message: "Taxi driver application reviewed", data: await this.taxi.reviewDriverApplication(applicationId, user.id, dto) };
  }

  @Get("waitlist")
  @ApiOperation({ summary: "List customer Taxi waitlist entries" })
  async waitlist(@Query() query: ListTaxiWaitlistQueryDto) {
    return { message: "Taxi waitlist entries retrieved", data: await this.taxi.listWaitlist(query) };
  }

  @Get("waitlist/:entryId")
  @ApiOperation({ summary: "Get customer Taxi waitlist entry detail" })
  async waitlistEntry(@Param("entryId", ParseUUIDPipe) entryId: string) {
    return { message: "Taxi waitlist entry retrieved", data: await this.taxi.waitlistDetail(entryId) };
  }

  @Patch("waitlist/:entryId/status")
  @ApiOperation({ summary: "Update a customer Taxi waitlist status" })
  async updateWaitlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateTaxiWaitlistStatusDto
  ) {
    return { message: "Taxi waitlist status updated", data: await this.taxi.updateWaitlistStatus(entryId, user.id, dto) };
  }

  @Get("driver-profiles")
  @ApiOperation({ summary: "List Taxi staging driver profiles" })
  async driverProfiles() {
    return { message: "Taxi driver profiles retrieved", data: await this.taxi.adminDriverProfiles() };
  }

  @Post("driver-profiles/from-application/:applicationId")
  @ApiOperation({ summary: "Create a Taxi staging driver profile from an approved application" })
  async createProfile(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Taxi driver profile created", data: await this.taxi.adminCreateDriverProfileFromApplication(user.id, applicationId) };
  }

  @Patch("driver-profiles/:profileId/status")
  @ApiOperation({ summary: "Update Taxi staging driver profile status" })
  async updateProfileStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("profileId", ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateTaxiDriverProfileStatusDto
  ) {
    return { message: "Taxi driver profile status updated", data: await this.taxi.adminUpdateDriverProfileStatus(user.id, profileId, dto) };
  }

  @Get("trips")
  @ApiOperation({ summary: "List staging Taxi trips" })
  async trips() {
    return { message: "Taxi trips retrieved", data: await this.taxi.adminTrips() };
  }

  @Get("trips/:tripId")
  @ApiOperation({ summary: "Get staging Taxi trip detail" })
  async trip(@Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Taxi trip retrieved", data: await this.taxi.adminTrip(tripId) };
  }

  @Patch("trips/:tripId/assign-driver")
  @ApiOperation({ summary: "Assign a staging Taxi driver" })
  async assignDriver(
    @CurrentUser() user: AuthenticatedUser,
    @Param("tripId", ParseUUIDPipe) tripId: string,
    @Body() dto: AdminAssignTaxiDriverDto
  ) {
    return { message: "Taxi driver assigned", data: await this.taxi.adminAssignDriver(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel a staging Taxi trip" })
  async cancelTrip(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "Taxi trip cancelled", data: await this.taxi.adminCancelTrip(user.id, tripId, dto) };
  }

  @Get("summary")
  @ApiOperation({ summary: "Get staging Taxi operations summary" })
  async summary() {
    return { message: "Taxi summary retrieved", data: await this.taxi.adminSummary() };
  }
}
