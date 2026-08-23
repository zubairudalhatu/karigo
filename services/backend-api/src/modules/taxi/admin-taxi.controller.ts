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
import { ReviewCaptainApplicationDocumentDto } from "../riders/dto/review-captain-application-document.dto";
import { CaptainApplicationTrashDto } from "../riders/dto/captain-application-trash.dto";
import { TaxiCancelDto } from "./dto/taxi-cancel.dto";
import { UpdateTaxiWaitlistStatusDto } from "./dto/update-taxi-waitlist-status.dto";
import { AllocateRideRefundResponsibilityDto, CreateRideFinancialAdjustmentDto, CreateRideRefundDto, ListRideFinanceQueryDto, OpenRideFinancialDisputeDto, RecordRideCommissionRemittanceDto, ResolveRideFinancialDisputeDto, SettleCashRideRefundDto } from "./dto/ride-finance.dto";
import { RideFinanceService } from "./ride-finance.service";
import { TaxiService } from "./taxi.service";

const TAXI_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.RIDER_MANAGER,
  AdminRole.SUPPORT_AGENT
];

@ApiTags("Admin KariGO Rides")
@ApiBearerAuth()
@Controller("admin/taxi")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...TAXI_ADMINS)
export class AdminTaxiController {
  constructor(private readonly taxi: TaxiService, private readonly finance: RideFinanceService) {}

  @Get("finance/summary")
  @AdminRoles(...TAXI_ADMINS, AdminRole.FINANCE_OFFICER)
  async financeSummary(@Query() query: ListRideFinanceQueryDto) { return { message: "Ride finance summary retrieved", data: await this.finance.adminSummary(query) }; }

  @Get("finance/settlements")
  @AdminRoles(...TAXI_ADMINS, AdminRole.FINANCE_OFFICER)
  async financeSettlements(@Query() query: ListRideFinanceQueryDto) { return { message: "Ride settlements retrieved", data: await this.finance.adminSettlements(query) }; }

  @Get("finance/captains")
  @AdminRoles(...TAXI_ADMINS, AdminRole.FINANCE_OFFICER)
  async financeCaptains(@Query() query: ListRideFinanceQueryDto) { return { message: "Ride Captain finance summaries retrieved", data: await this.finance.adminCaptainSummaries(query) }; }

  @Get("finance/export")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async financeExport(@Query() query: ListRideFinanceQueryDto) { return { message: "Ride finance CSV prepared", data: await this.finance.exportCsv(query) }; }

  @Post("finance/remittances")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async recordRemittance(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordRideCommissionRemittanceDto) { return { message: "Commission remittance recorded", data: await this.finance.recordRemittance(user.id, dto) }; }

  @Post("trips/:tripId/refunds")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async approveRefund(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: CreateRideRefundDto) { return { message: "Cash Ride refund approved", data: await this.finance.approveRefund(user.id, tripId, dto) }; }

  @Post("refunds/:refundId/settle")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async settleRefund(@CurrentUser() user: AuthenticatedUser, @Param("refundId", ParseUUIDPipe) refundId: string, @Body() dto: SettleCashRideRefundDto) { return { message: "Cash Ride refund settled", data: await this.finance.settleCashRefund(user.id, refundId, dto) }; }

  @Patch("refunds/:refundId/responsibility")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async allocateRefundResponsibility(@CurrentUser() user: AuthenticatedUser, @Param("refundId", ParseUUIDPipe) refundId: string, @Body() dto: AllocateRideRefundResponsibilityDto) { return { message: "Ride refund responsibility allocated", data: await this.finance.allocateRefundResponsibility(user.id, refundId, dto) }; }

  @Post("trips/:tripId/adjustments")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async createAdjustment(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: CreateRideFinancialAdjustmentDto) { return { message: "Ride financial adjustment recorded", data: await this.finance.createAdjustment(user.id, tripId, dto) }; }

  @Post("trips/:tripId/dispute")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async openDispute(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: OpenRideFinancialDisputeDto) { return { message: "Ride financial review opened", data: await this.finance.openDispute(user.id, tripId, dto.reason, dto.note) }; }

  @Post("trips/:tripId/dispute/resolve")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  async resolveDispute(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: ResolveRideFinancialDisputeDto) { return { message: "Ride financial review resolved", data: await this.finance.resolveDispute(user.id, tripId, dto.resolutionNote) }; }

  @Get("driver-applications")
  @ApiOperation({ summary: "List Ride Captain applications" })
  async driverApplications(@Query() query: ListTaxiDriverApplicationsQueryDto) {
    return { message: "Ride Captain applications retrieved", data: await this.taxi.listDriverApplications(query) };
  }

  @Get("driver-applications/trash")
  @ApiOperation({ summary: "List trashed rejected Ride Captain applications" })
  async driverApplicationsTrash() {
    return { message: "Trashed Ride Captain applications retrieved", data: await this.taxi.listTrashedRideCaptainApplications() };
  }

  @Get("driver-applications/:applicationId")
  @ApiOperation({ summary: "Get Ride Captain application detail" })
  async driverApplication(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Ride Captain application retrieved", data: await this.taxi.driverApplicationDetail(applicationId) };
  }

  @Get("driver-applications/:applicationId/documents/:documentId/view")
  @ApiOperation({ summary: "Create a short-lived secure view URL for a Ride Captain application document" })
  async driverApplicationDocumentView(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string
  ) {
    return { message: "Ride Captain document view URL created", data: await this.taxi.adminRideCaptainDocumentViewUrl(applicationId, documentId) };
  }

  @Patch("driver-applications/:applicationId/documents/required/approve")
  @ApiOperation({ summary: "Approve all uploaded required Ride Captain secure documents" })
  async approveRequiredDriverApplicationDocuments(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Required Ride Captain documents approved", data: await this.taxi.approveRequiredRideCaptainDocuments(user.id, applicationId) };
  }

  @Patch("driver-applications/:applicationId/documents/:documentId/review")
  @ApiOperation({ summary: "Review a Ride Captain secure application document" })
  async reviewDriverApplicationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() dto: ReviewCaptainApplicationDocumentDto
  ) {
    return { message: "Ride Captain document reviewed", data: await this.taxi.reviewRideCaptainApplicationDocument(user.id, applicationId, documentId, dto) };
  }

  @Patch("driver-applications/:applicationId/review")
  @ApiOperation({ summary: "Review a Ride Captain application" })
  async reviewDriverApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: ReviewTaxiDriverApplicationDto
  ) {
    return { message: "Ride Captain application reviewed", data: await this.taxi.reviewDriverApplication(applicationId, user.id, dto) };
  }

  @Patch("driver-applications/:applicationId/trash")
  @ApiOperation({ summary: "Move a rejected Ride Captain application to Trash" })
  async trashDriverApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: CaptainApplicationTrashDto
  ) {
    return { message: "Ride Captain application moved to Trash", data: await this.taxi.trashRideCaptainApplication(user.id, applicationId, dto) };
  }

  @Patch("driver-applications/:applicationId/restore")
  @ApiOperation({ summary: "Restore a trashed Ride Captain application" })
  async restoreDriverApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: CaptainApplicationTrashDto
  ) {
    return { message: "Ride Captain application restored", data: await this.taxi.restoreRideCaptainApplication(user.id, applicationId, dto) };
  }

  @Get("waitlist")
  @ApiOperation({ summary: "List customer KariGO Rides waitlist entries" })
  async waitlist(@Query() query: ListTaxiWaitlistQueryDto) {
    return { message: "KariGO Rides waitlist entries retrieved", data: await this.taxi.listWaitlist(query) };
  }

  @Get("waitlist/:entryId")
  @ApiOperation({ summary: "Get customer KariGO Rides waitlist entry detail" })
  async waitlistEntry(@Param("entryId", ParseUUIDPipe) entryId: string) {
    return { message: "KariGO Rides waitlist entry retrieved", data: await this.taxi.waitlistDetail(entryId) };
  }

  @Patch("waitlist/:entryId/status")
  @ApiOperation({ summary: "Update a customer Taxi waitlist status" })
  async updateWaitlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateTaxiWaitlistStatusDto
  ) {
    return { message: "KariGO Rides waitlist status updated", data: await this.taxi.updateWaitlistStatus(entryId, user.id, dto) };
  }

  @Get("driver-profiles")
  @ApiOperation({ summary: "List production Ride Captain profiles" })
  async driverProfiles() {
    return { message: "Ride Captain profiles retrieved", data: await this.taxi.adminDriverProfiles() };
  }

  @Post("driver-profiles/from-application/:applicationId")
  @ApiOperation({ summary: "Prepare a production Ride Captain profile from an approved application" })
  async createProfile(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Ride Captain profile prepared", data: await this.taxi.adminCreateDriverProfileFromApplication(user.id, applicationId) };
  }

  @Patch("driver-profiles/:profileId/status")
  @ApiOperation({ summary: "Update production Ride Captain profile status" })
  async updateProfileStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("profileId", ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateTaxiDriverProfileStatusDto
  ) {
    return { message: "Ride Captain profile status updated", data: await this.taxi.adminUpdateDriverProfileStatus(user.id, profileId, dto) };
  }

  @Get("trips")
  @ApiOperation({ summary: "List KariGO Ride trips" })
  async trips() {
    return { message: "KariGO Rides trips retrieved", data: await this.taxi.adminTrips() };
  }

  @Get("trips/:tripId")
  @ApiOperation({ summary: "Get KariGO Ride trip detail" })
  async trip(@Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "KariGO Rides trip retrieved", data: await this.taxi.adminTrip(tripId) };
  }

  @Get("trips/:tripId/eligible-drivers")
  @ApiOperation({ summary: "List eligible Ride Captains for manual production dispatch" })
  async eligibleDrivers(@Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Eligible Ride Captains retrieved", data: await this.taxi.adminEligibleDrivers(tripId) };
  }

  @Patch("trips/:tripId/assign-driver")
  @ApiOperation({ summary: "Manually assign a Ride Captain to a KariGO Ride" })
  async assignDriver(
    @CurrentUser() user: AuthenticatedUser,
    @Param("tripId", ParseUUIDPipe) tripId: string,
    @Body() dto: AdminAssignTaxiDriverDto
  ) {
    return { message: "Ride Captain assigned", data: await this.taxi.adminAssignDriver(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/cancel")
  @ApiOperation({ summary: "Cancel a KariGO Ride trip" })
  async cancelTrip(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string, @Body() dto: TaxiCancelDto) {
    return { message: "KariGO Rides trip cancelled", data: await this.taxi.adminCancelTrip(user.id, tripId, dto) };
  }

  @Post("trips/:tripId/receipt-email/retry")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT)
  @ApiOperation({ summary: "Retry a failed KariGO Ride receipt email" })
  async retryReceiptEmail(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) tripId: string) {
    return { message: "Ride receipt email retry requested", data: await this.taxi.adminRetryRideReceiptEmail(user.id, tripId) };
  }

  @Get("summary")
  @ApiOperation({ summary: "Get KariGO Ride operations summary" })
  async summary() {
    return { message: "KariGO Rides summary retrieved", data: await this.taxi.adminSummary() };
  }
}
