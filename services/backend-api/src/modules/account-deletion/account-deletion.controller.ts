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
import { AccountDeletionService } from "./account-deletion.service";
import { ListAccountDeletionRequestsQueryDto, UpdateAccountDeletionRequestDto } from "./dto/admin-account-deletion.dto";
import { CancelAccountDeletionDto, RequestAccountDeletionDto } from "./dto/request-account-deletion.dto";

const accountDeletionAdminRoles = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.SUPPORT_AGENT,
  AdminRole.VENDOR_MANAGER,
  AdminRole.RIDER_MANAGER,
  AdminRole.FINANCE_OFFICER
];

@ApiTags("Account deletion")
@ApiBearerAuth()
@Controller("account-deletion")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.RIDER, UserRole.VENDOR)
export class AccountDeletionController {
  constructor(private readonly accountDeletion: AccountDeletionService) {}

  @Get()
  @ApiOperation({ summary: "Get the signed-in user's current account deletion request, if any" })
  async current(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Account deletion request status retrieved", data: await this.accountDeletion.currentStatus(user.id) };
  }

  @Post()
  @ApiOperation({ summary: "Request account deletion or role-specific deactivation for the signed-in user" })
  async request(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestAccountDeletionDto) {
    return { message: "Account deletion request recorded", data: await this.accountDeletion.request(user.id, dto) };
  }

  @Post("cancel")
  @ApiOperation({ summary: "Cancel a pending account deletion request when still allowed" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Body() dto: CancelAccountDeletionDto) {
    return { message: "Account deletion request cancelled", data: await this.accountDeletion.cancel(user.id, dto) };
  }
}

@ApiTags("Admin Account Deletion")
@ApiBearerAuth()
@Controller("admin/account-deletion-requests")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...accountDeletionAdminRoles)
export class AdminAccountDeletionController {
  constructor(private readonly accountDeletion: AccountDeletionService) {}

  @Get()
  @ApiOperation({ summary: "List account deletion and role deactivation requests" })
  async list(@Query() query: ListAccountDeletionRequestsQueryDto) {
    return { message: "Account deletion requests retrieved", data: await this.accountDeletion.adminList(query) };
  }

  @Get(":requestId")
  @ApiOperation({ summary: "Review a single account deletion request" })
  async detail(@Param("requestId", ParseUUIDPipe) requestId: string) {
    return { message: "Account deletion request retrieved", data: await this.accountDeletion.adminDetail(requestId) };
  }

  @Patch(":requestId/status")
  @ApiOperation({ summary: "Update an account deletion request status with audit note" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId", ParseUUIDPipe) requestId: string,
    @Body() dto: UpdateAccountDeletionRequestDto
  ) {
    return {
      message: "Account deletion request updated",
      data: await this.accountDeletion.adminUpdate(user.id, requestId, dto)
    };
  }
}
