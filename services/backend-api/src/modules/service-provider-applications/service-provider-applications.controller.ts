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
import { ApproveCreateServiceProviderDto } from "./dto/approve-create-service-provider.dto";
import { CreateServiceProviderApplicationDto } from "./dto/create-service-provider-application.dto";
import { ListServiceProviderApplicationsQueryDto } from "./dto/list-service-provider-applications-query.dto";
import { ReviewServiceProviderApplicationDto } from "./dto/review-service-provider-application.dto";
import { ServiceProviderApplicationStatusQueryDto } from "./dto/service-provider-application-status-query.dto";
import { ServiceProviderApplicationsService } from "./service-provider-applications.service";

const SERVICE_PROVIDER_APPLICATION_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.VENDOR_MANAGER,
  AdminRole.SUPPORT_AGENT
];

@ApiTags("Service Provider Applications")
@Controller("service-provider-applications")
export class PublicServiceProviderApplicationsController {
  constructor(private readonly applications: ServiceProviderApplicationsService) {}

  @Post()
  @ApiOperation({ summary: "Submit a public SME Services provider application" })
  async create(@Body() dto: CreateServiceProviderApplicationDto) {
    return { message: "Service provider application submitted", data: await this.applications.create(dto) };
  }

  @Get("status")
  @ApiOperation({ summary: "Look up public SME Services provider application status" })
  async status(@Query() query: ServiceProviderApplicationStatusQueryDto) {
    return { message: "Service provider application status retrieved", data: await this.applications.publicStatus(query) };
  }
}

@ApiTags("Admin Service Provider Applications")
@ApiBearerAuth()
@Controller("admin/service-provider-applications")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...SERVICE_PROVIDER_APPLICATION_ADMINS)
export class AdminServiceProviderApplicationsController {
  constructor(private readonly applications: ServiceProviderApplicationsService) {}

  @Get()
  @ApiOperation({ summary: "List SME Services provider applications for admin review" })
  async list(@Query() query: ListServiceProviderApplicationsQueryDto) {
    return { message: "Service provider applications retrieved", data: await this.applications.adminList(query) };
  }

  @Get(":applicationId")
  @ApiOperation({ summary: "Get one SME Services provider application for admin review" })
  async detail(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Service provider application retrieved", data: await this.applications.adminDetail(applicationId) };
  }

  @Patch(":applicationId/status")
  @ApiOperation({ summary: "Update an SME Services provider application review status" })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: ReviewServiceProviderApplicationDto
  ) {
    return { message: "Service provider application reviewed", data: await this.applications.adminReview(applicationId, user.id, dto) };
  }

  @Post(":applicationId/approve-create-provider")
  @ApiOperation({ summary: "Convert an approved SME Services application into an internal provider record" })
  async approveCreateProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Body() dto: ApproveCreateServiceProviderDto
  ) {
    return {
      message: "Service provider application converted to provider record",
      data: await this.applications.approveCreateProvider(applicationId, user.id, dto)
    };
  }
}
