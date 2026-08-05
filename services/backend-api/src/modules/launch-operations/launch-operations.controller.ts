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
  AddLaunchCohortMembersDto,
  CreateLaunchCohortDto,
  CreateLaunchDrillDto,
  CreateLaunchIncidentDto,
  LaunchAvailabilityQueryDto,
  PauseFromIncidentDto,
  UpdateLaunchCohortDto,
  UpdateLaunchCohortMemberDto,
  UpdateLaunchConfigDto,
  UpdateLaunchDrillDto,
  UpdateLaunchIncidentDto,
  UpdateLaunchReadinessDto
} from "./dto/launch-operations.dto";
import { LaunchOperationsService } from "./launch-operations.service";

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
  constructor(private readonly launch: LaunchOperationsService) {}

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

\n