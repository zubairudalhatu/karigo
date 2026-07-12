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
import { AssignServiceProviderDto } from "./dto/assign-service-provider.dto";
import { CreateServiceProviderDto } from "./dto/create-service-provider.dto";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";
import { ListServiceProvidersQueryDto } from "./dto/list-service-providers-query.dto";
import { ListServiceProviderRequestsQueryDto } from "./dto/list-service-provider-requests-query.dto";
import { RecordSmeServicesPilotLaunchDecisionDto } from "./dto/record-sme-services-pilot-launch-decision.dto";
import { UpdateSmeServicesPilotReadinessDto } from "./dto/update-sme-services-pilot-readiness.dto";
import { UpdateServiceProviderDto } from "./dto/update-service-provider.dto";
import { UpdateServiceProviderRequestStatusDto } from "./dto/update-service-provider-request-status.dto";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

const SERVICE_REQUEST_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT, AdminRole.VENDOR_MANAGER];

@ApiTags("SME Services")
@ApiBearerAuth()
@Controller("service-provider-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class ServiceProviderRequestsController {
  constructor(private readonly serviceRequests: ServiceProviderRequestsService) {}

  @Get("catalogue")
  @ApiOperation({ summary: "List SME Services provider categories" })
  catalogue() {
    return { message: "SME Services catalogue retrieved", data: this.serviceRequests.catalogue() };
  }

  @Post()
  @ApiOperation({ summary: "Create an SME Services provider request" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceProviderRequestDto) {
    return { message: "SME Services request submitted", data: await this.serviceRequests.create(user.id, dto) };
  }

  @Get("my-requests")
  @ApiOperation({ summary: "List the authenticated customer's SME Services requests" })
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    return { message: "SME Services requests retrieved", data: await this.serviceRequests.listMine(user.id) };
  }

  @Get(":requestId")
  @ApiOperation({ summary: "Get an owned SME Services request" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("requestId", ParseUUIDPipe) requestId: string) {
    return { message: "SME Services request retrieved", data: await this.serviceRequests.detail(user.id, requestId) };
  }
}

@ApiTags("Admin SME Services")
@ApiBearerAuth()
@Controller("admin/service-provider-requests")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...SERVICE_REQUEST_ADMINS)
export class AdminServiceProviderRequestsController {
  constructor(private readonly serviceRequests: ServiceProviderRequestsService) {}

  @Get()
  @ApiOperation({ summary: "List SME Services requests for admin review" })
  async list(@Query() query: ListServiceProviderRequestsQueryDto) {
    return { message: "SME Services requests retrieved", data: await this.serviceRequests.adminList(query) };
  }

  @Get("summary")
  @ApiOperation({ summary: "Get SME Services operations summary for admin monitoring" })
  async summary() {
    return { message: "SME Services operations summary retrieved", data: await this.serviceRequests.adminSummary() };
  }

  @Get("report")
  @ApiOperation({ summary: "Generate an SME Services pilot operations report for admin review" })
  async report() {
    return { message: "SME Services pilot report generated", data: await this.serviceRequests.adminReport() };
  }

  @Get(":requestId")
  @ApiOperation({ summary: "Get one SME Services request for admin review" })
  async detail(@Param("requestId", ParseUUIDPipe) requestId: string) {
    return { message: "SME Services request retrieved", data: await this.serviceRequests.adminDetail(requestId) };
  }

  @Patch(":requestId/status")
  @ApiOperation({ summary: "Update an SME Services request review status" })
  async status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() dto: UpdateServiceProviderRequestStatusDto
  ) {
    return { message: "SME Services request status updated", data: await this.serviceRequests.adminUpdateStatus(user.id, requestId, dto) };
  }

  @Patch(":requestId/provider-assignment")
  @ApiOperation({ summary: "Manually assign an approved SME Services provider to a request" })
  async assignProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() dto: AssignServiceProviderDto
  ) {
    return { message: "SME Services provider assignment recorded", data: await this.serviceRequests.adminAssignProvider(user.id, requestId, dto) };
  }
}

@ApiTags("Admin SME Services Pilot Readiness")
@ApiBearerAuth()
@Controller("admin/sme-services")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...SERVICE_REQUEST_ADMINS)
export class AdminSmeServicesPilotReadinessController {
  constructor(private readonly serviceRequests: ServiceProviderRequestsService) {}

  @Get("pilot-readiness")
  @ApiOperation({ summary: "Get SME Services pilot readiness checklist" })
  async readiness() {
    return { message: "SME Services pilot readiness checklist retrieved", data: await this.serviceRequests.adminPilotReadiness() };
  }

  @Patch("pilot-readiness")
  @ApiOperation({ summary: "Update SME Services pilot readiness checklist" })
  async updateReadiness(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSmeServicesPilotReadinessDto) {
    return { message: "SME Services pilot readiness checklist updated", data: await this.serviceRequests.adminUpdatePilotReadiness(user.id, dto) };
  }

  @Get("pilot-launch-control")
  @ApiOperation({ summary: "Get SME Services pilot launch Go/No-Go control record" })
  async launchControl() {
    return { message: "SME Services pilot launch control retrieved", data: await this.serviceRequests.adminPilotLaunchControl() };
  }

  @Post("pilot-launch-control")
  @ApiOperation({ summary: "Record an SME Services pilot launch Go/No-Go decision" })
  async recordLaunchDecision(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordSmeServicesPilotLaunchDecisionDto) {
    return { message: "SME Services pilot launch decision recorded", data: await this.serviceRequests.adminRecordPilotLaunchDecision(user.id, dto) };
  }
}

@ApiTags("Admin SME Services Providers")
@ApiBearerAuth()
@Controller("admin/service-providers")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...SERVICE_REQUEST_ADMINS)
export class AdminServiceProvidersController {
  constructor(private readonly serviceRequests: ServiceProviderRequestsService) {}

  @Get()
  @ApiOperation({ summary: "List SME Services providers for admin operations" })
  async list(@Query() query: ListServiceProvidersQueryDto) {
    return { message: "SME Services providers retrieved", data: await this.serviceRequests.adminListProviders(query) };
  }

  @Post()
  @ApiOperation({ summary: "Create an admin-managed SME Services provider record" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceProviderDto) {
    return { message: "SME Services provider created", data: await this.serviceRequests.adminCreateProvider(user.id, dto) };
  }

  @Get(":providerId")
  @ApiOperation({ summary: "Get one SME Services provider record" })
  async detail(@Param("providerId", ParseUUIDPipe) providerId: string) {
    return { message: "SME Services provider retrieved", data: await this.serviceRequests.adminProviderDetail(providerId) };
  }

  @Patch(":providerId")
  @ApiOperation({ summary: "Update an admin-managed SME Services provider record" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("providerId", ParseUUIDPipe) providerId: string,
    @Body() dto: UpdateServiceProviderDto
  ) {
    return { message: "SME Services provider updated", data: await this.serviceRequests.adminUpdateProvider(user.id, providerId, dto) };
  }
}
