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
import { ListUtilityTransactionsQueryDto } from "./dto/list-utility-transactions-query.dto";
import { UpdateUtilityTransactionStatusDto } from "./dto/update-utility-status.dto";
import { UtilitiesService } from "./utilities.service";

const UTILITY_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.FINANCE_OFFICER,
  AdminRole.SUPPORT_AGENT
];

@ApiTags("Admin Utilities")
@ApiBearerAuth()
@Controller("admin/utilities")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...UTILITY_ADMINS)
export class AdminUtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get admin Bills & Utilities summary metrics" })
  async summary() {
    return { message: "Utility summary retrieved", data: await this.utilities.adminSummary() };
  }

  @Get("transactions")
  @ApiOperation({ summary: "List utility transactions for admin monitoring" })
  async transactions(@Query() query: ListUtilityTransactionsQueryDto) {
    return { message: "Utility transactions retrieved", data: await this.utilities.adminList(query) };
  }

  @Get("transactions/:transactionId")
  @ApiOperation({ summary: "Get utility transaction detail for admin monitoring" })
  async transaction(@Param("transactionId", ParseUUIDPipe) transactionId: string) {
    return { message: "Utility transaction retrieved", data: await this.utilities.adminDetail(transactionId) };
  }

  @Patch("transactions/:transactionId/status")
  @ApiOperation({ summary: "Override a utility transaction status for staging operations" })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
    @Body() dto: UpdateUtilityTransactionStatusDto
  ) {
    return { message: "Utility transaction status updated", data: await this.utilities.adminUpdateStatus(user.id, transactionId, dto) };
  }

  @Post("transactions/:transactionId/verify")
  @ApiOperation({ summary: "Verify utility transaction status with the configured provider" })
  async verifyProviderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("transactionId", ParseUUIDPipe) transactionId: string
  ) {
    return { message: "Utility provider status checked", data: await this.utilities.adminVerifyProviderStatus(user.id, transactionId) };
  }
}
