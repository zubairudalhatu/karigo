import { Body, Controller, Get, Header, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, LaunchServiceType, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  AddControlledOperationsCustomerDto,
  AddControlledSupplyMemberDto,
  AddLaunchCohortMembersDto,
  CreateControlledSupplyGroupDto,
  CreateLaunchCohortDto,
  CreateLaunchDrillDto,
  CreateLaunchIncidentDto,
  LinkLaunchDrillFailureDto,
  LaunchAvailabilityQueryDto,
  PauseFromIncidentDto,
  FinishQuickLaunchDto,
  QuickLaunchCustomerSearchQueryDto,
  QuickLaunchSearchQueryDto,
  ReopenLaunchDrillDto,
  StartQuickLaunchDto,
  UpdateControlledOperationsCustomerDto,
  UpdateControlledSupplyGroupDto,
  UpdateControlledSupplyMemberDto,
  UpdateLaunchCohortDto,
  UpdateLaunchCohortMemberDto,
  UpdateLaunchConfigDto,
  UpdateLaunchDrillDto,
  UpdateLaunchDrillStepDto,
  UpdateLaunchIncidentDto,
  UpdateLaunchReadinessDto,
  UpdateOperationsChecklistItemDto
} from "./dto/launch-operations.dto";
import { ControlledSupplyService } from "./controlled-supply.service";
import { LaunchOperationsService } from "./launch-operations.service";
import { QuickLaunchService } from "./quick-launch.service";

const LAUNCH_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.DISPATCH_OFFICER];

@ApiTags("Production Launch")
@Controller("launch")
export class LaunchAvailabilityController {
  constructor(private readonly launch: LaunchOperationsService) {}

  @Get("availability")
  @ApiOperation({ summary: "Resolve public-safe city and service availability" })
  async availability(@Query() query: LaunchAvailabilityQueryDto) {
    return { message: "Launch availability resolved", data: await this.launch.publicAvailability(query.city, query.zoneId) };
  }

  @Get("availability/me/captain")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.RIDER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resolve server-verified Captain launch availability" })
  async myCaptainAvailability(@CurrentUser() user: AuthenticatedUser, @Query() query: LaunchAvailabilityQueryDto) {
    return { message: "Captain launch availability resolved", data: await this.launch.captainAvailability(query.city, query.zoneId, user.id) };
  }

  @Get("availability/me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.RIDER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resolve account-aware city and service availability" })
  async myAvailability(@CurrentUser() user: AuthenticatedUser, @Query() query: LaunchAvailabilityQueryDto) {
    return { message: "Account launch availability resolved", data: await this.launch.publicAvailability(query.city, query.zoneId, user.id) };
  }
}

@ApiTags("Admin Production Launch")
@Controller("admin/production-launch")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...LAUNCH_ADMINS)
@ApiBearerAuth()
export class AdminLaunchOperationsController {
  constructor(private readonly launch: LaunchOperationsService, private readonly controlled: ControlledSupplyService, private readonly quickLaunch: QuickLaunchService) {}

  @Get("quick-launch/context")
  quickLaunchContext(@Query() query: QuickLaunchSearchQueryDto) { return this.wrap("Quick Launch context retrieved", this.quickLaunch.context(query.city, query.serviceType)); }
  @Get("quick-launch/diagnostics")
  quickLaunchDiagnostics() { return this.wrap("Quick Launch identity diagnostics retrieved", this.quickLaunch.identityDiagnostics()); }


  @Get("quick-launch/customers")
  quickLaunchCustomers(@Query() query: QuickLaunchCustomerSearchQueryDto) { return this.wrap("Quick Launch Customer candidates retrieved", this.quickLaunch.customerDiscovery(query)); }

  @Get("quick-launch/captains")
  quickLaunchCaptains(@Query() query: QuickLaunchSearchQueryDto) { return this.wrap("Quick Launch Captain candidates retrieved", this.quickLaunch.captainDiscovery(query)); }

  @Get("quick-launch/partners")
  quickLaunchPartners(@Query() query: QuickLaunchSearchQueryDto) { return this.wrap("Quick Launch Partner candidates retrieved", this.quickLaunch.partnerDiscovery(query)); }

  @Post("quick-launch/start")
  startQuickLaunch(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartQuickLaunchDto) { return this.wrap("Controlled test started", this.quickLaunch.start(user.id, dto)); }

  @Post("quick-launch/drills/:drillId/finish")
  finishQuickLaunch(@CurrentUser() user: AuthenticatedUser, @Param("drillId", ParseUUIDPipe) drillId: string, @Body() dto: FinishQuickLaunchDto) { return this.wrap("Controlled test finished", this.quickLaunch.finish(drillId, user.id, dto)); }

  @Get("command-centre")
  commandCentre() { return this.wrap("Production launch command centre retrieved", this.launch.commandCentre()); }

  @Get("configs")
  configs() { return this.wrap("Launch configurations retrieved", this.launch.configs()); }

  @Patch("configs/:city/:serviceType")
  updateConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param("city") city: string,
    @Param("serviceType", new ParseEnumPipe(LaunchServiceType)) serviceType: LaunchServiceType,
    @Body() dto: UpdateLaunchConfigDto
  ) { return this.wrap("Launch configuration updated", this.launch.updateConfig(city, serviceType, user.id, dto)); }

  @Get("history")
  history() { return this.wrap("Launch configuration history retrieved", this.launch.history()); }

  @Get("cohorts")
  cohorts() { return this.wrap("Launch cohorts retrieved", this.launch.cohorts()); }

  @Post("cohorts")
  createCohort(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLaunchCohortDto) { return this.wrap("Launch cohort created", this.launch.createCohort(user.id, dto)); }

  @Patch("cohorts/:cohortId")
  updateCohort(@CurrentUser() user: AuthenticatedUser, @Param("cohortId", ParseUUIDPipe) cohortId: string, @Body() dto: UpdateLaunchCohortDto) { return this.wrap("Launch cohort updated", this.launch.updateCohort(cohortId, user.id, dto)); }

  @Post("cohorts/:cohortId/members")
  addCohortMembers(@CurrentUser() user: AuthenticatedUser, @Param("cohortId", ParseUUIDPipe) cohortId: string, @Body() dto: AddLaunchCohortMembersDto) { return this.wrap("Launch cohort members added", this.launch.addCohortMembers(cohortId, user.id, dto)); }

  @Patch("cohorts/:cohortId/members/:memberId")
  updateCohortMember(@CurrentUser() user: AuthenticatedUser, @Param("cohortId", ParseUUIDPipe) cohortId: string, @Param("memberId", ParseUUIDPipe) memberId: string, @Body() dto: UpdateLaunchCohortMemberDto) { return this.wrap("Launch cohort member updated", this.launch.updateCohortMember(cohortId, memberId, user.id, dto)); }

  @Get("readiness/:city")
  readiness(@Param("city") city: string) { return this.wrap("City launch readiness retrieved", this.launch.readiness(city)); }

  @Patch("readiness/:city/:itemId")
  updateReadiness(@CurrentUser() user: AuthenticatedUser, @Param("city") city: string, @Param("itemId", ParseUUIDPipe) itemId: string, @Body() dto: UpdateLaunchReadinessDto) { return this.wrap("City launch readiness updated", this.launch.updateReadiness(city, itemId, user.id, dto)); }

  @Get("supply")
  supply(@Query("city") city?: string) { return this.wrap("Launch supply retrieved", this.launch.supply(city)); }

  @Get("controlled-groups")
  controlledGroups(@Query("city") city?: string) { return this.wrap("Controlled supply groups retrieved", this.controlled.groups(city)); }

  @Post("controlled-groups")
  createControlledGroup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateControlledSupplyGroupDto) { return this.wrap("Controlled supply group created", this.controlled.createGroup(user.id, dto)); }

  @Patch("controlled-groups/:groupId")
  updateControlledGroup(@CurrentUser() user: AuthenticatedUser, @Param("groupId", ParseUUIDPipe) groupId: string, @Body() dto: UpdateControlledSupplyGroupDto) { return this.wrap("Controlled supply group updated", this.controlled.updateGroup(groupId, user.id, dto)); }

  @Post("controlled-groups/:groupId/members")
  addControlledMember(@CurrentUser() user: AuthenticatedUser, @Param("groupId", ParseUUIDPipe) groupId: string, @Body() dto: AddControlledSupplyMemberDto) { return this.wrap("Controlled supply member added", this.controlled.addMember(groupId, user.id, dto)); }

  @Patch("controlled-groups/:groupId/members/:memberId")
  updateControlledMember(@CurrentUser() user: AuthenticatedUser, @Param("groupId", ParseUUIDPipe) groupId: string, @Param("memberId", ParseUUIDPipe) memberId: string, @Body() dto: UpdateControlledSupplyMemberDto) { return this.wrap("Controlled supply member updated", this.controlled.updateMember(groupId, memberId, user.id, dto)); }

  @Get("controlled-customers")
  controlledCustomers(@Query("city") city?: string) { return this.wrap("Controlled Operations Customers retrieved", this.controlled.customers(city)); }

  @Post("controlled-customers")
  addControlledCustomer(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddControlledOperationsCustomerDto) { return this.wrap("Controlled Operations Customer added", this.controlled.addCustomer(user.id, dto)); }

  @Patch("controlled-customers/:customerId")
  updateControlledCustomer(@CurrentUser() user: AuthenticatedUser, @Param("customerId", ParseUUIDPipe) customerId: string, @Body() dto: UpdateControlledOperationsCustomerDto) { return this.wrap("Controlled Operations Customer updated", this.controlled.updateCustomer(customerId, user.id, dto)); }

  @Get("controlled-captains")
  controlledCaptains(@Query("city") city: string, @Query("serviceType", new ParseEnumPipe(LaunchServiceType)) serviceType: LaunchServiceType) { return this.wrap("Controlled Captain eligibility retrieved", this.controlled.captainEligibility(city, serviceType)); }

  @Get("controlled-partners")
  controlledPartners(@Query("city") city: string, @Query("serviceType", new ParseEnumPipe(LaunchServiceType)) serviceType: LaunchServiceType) { return this.wrap("Controlled Partner eligibility retrieved", this.controlled.partnerEligibility(city, serviceType)); }

  @Get("operations-checklist/:city/:serviceType")
  operationsChecklist(@Param("city") city: string, @Param("serviceType", new ParseEnumPipe(LaunchServiceType)) serviceType: LaunchServiceType) { return this.wrap("Operations-only checklist retrieved", this.controlled.checklist(city, serviceType)); }

  @Patch("operations-checklist/:city/:serviceType/:itemId")
  updateOperationsChecklist(@CurrentUser() user: AuthenticatedUser, @Param("city") city: string, @Param("serviceType", new ParseEnumPipe(LaunchServiceType)) serviceType: LaunchServiceType, @Param("itemId", ParseUUIDPipe) itemId: string, @Body() dto: UpdateOperationsChecklistItemDto) { return this.wrap("Operations-only checklist item updated", this.controlled.updateChecklist(city, serviceType, itemId, user.id, dto)); }

  @Get("controlled-readiness")
  controlledReadiness(@Query("city") city?: string) { return this.wrap("Controlled supply readiness retrieved", this.controlled.readinessProjection(city)); }

  @Get("controlled-monitor")
  controlledMonitor(@Query("city") city?: string) { return this.wrap("Live controlled supply monitor retrieved", this.controlled.monitor(city)); }

  @Get("controlled-audit")
  controlledAudit() { return this.wrap("Controlled supply audit history retrieved", this.controlled.auditHistory()); }

  @Get("incidents")
  incidents() { return this.wrap("Launch incidents retrieved", this.launch.incidents()); }

  @Post("incidents")
  createIncident(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLaunchIncidentDto) { return this.wrap("Launch incident created", this.launch.createIncident(user.id, dto)); }

  @Patch("incidents/:incidentId")
  updateIncident(@CurrentUser() user: AuthenticatedUser, @Param("incidentId", ParseUUIDPipe) incidentId: string, @Body() dto: UpdateLaunchIncidentDto) { return this.wrap("Launch incident updated", this.launch.updateIncident(incidentId, user.id, dto)); }

  @Post("incidents/:incidentId/pause-service")
  pauseFromIncident(@CurrentUser() user: AuthenticatedUser, @Param("incidentId", ParseUUIDPipe) incidentId: string, @Body() dto: PauseFromIncidentDto) { return this.wrap("Affected service paused", this.launch.pauseFromIncident(incidentId, user.id, dto)); }

  @Get("drills")
  drills() { return this.wrap("Launch drills retrieved", this.launch.drills()); }

  @Post("drills")
  createDrill(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLaunchDrillDto) { return this.wrap("Launch drill created", this.launch.createDrill(user.id, dto)); }

  @Patch("drills/:drillId")
  updateDrill(@CurrentUser() user: AuthenticatedUser, @Param("drillId", ParseUUIDPipe) drillId: string, @Body() dto: UpdateLaunchDrillDto) { return this.wrap("Launch drill updated", this.launch.updateDrill(drillId, user.id, dto)); }

  @Patch("drills/:drillId/steps/:stepId")
  updateDrillStep(@CurrentUser() user: AuthenticatedUser, @Param("drillId", ParseUUIDPipe) drillId: string, @Param("stepId", ParseUUIDPipe) stepId: string, @Body() dto: UpdateLaunchDrillStepDto) { return this.wrap("Launch drill step updated", this.launch.updateDrillStep(drillId, stepId, user.id, dto)); }

  @Post("drills/:drillId/reopen")
  reopenDrill(@CurrentUser() user: AuthenticatedUser, @Param("drillId", ParseUUIDPipe) drillId: string, @Body() dto: ReopenLaunchDrillDto) { return this.wrap("Launch drill reopened", this.launch.reopenDrill(drillId, user.id, dto)); }

  @Post("drills/:drillId/failure-follow-up")
  drillFailureFollowUp(@CurrentUser() user: AuthenticatedUser, @Param("drillId", ParseUUIDPipe) drillId: string, @Body() dto: LinkLaunchDrillFailureDto) { return this.wrap("Launch drill failure follow-up recorded", this.launch.linkDrillFailure(drillId, user.id, dto)); }

  @Get("support-queue")
  supportQueue() { return this.wrap("Launch support queue retrieved", this.launch.supportQueue()); }

  @Get("reports/daily")
  dailyReport(@Query("date") date?: string) { return this.wrap("Daily launch report generated", this.launch.dailyReport(date)); }

  @Get("reports/daily.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", "attachment; filename=karigo-daily-launch-report.csv")
  dailyReportCsv(@Query("date") date?: string) { return this.launch.dailyReportCsv(date); }

  private async wrap(message: string, promise: Promise<unknown>) { return { message, data: await promise }; }
}
