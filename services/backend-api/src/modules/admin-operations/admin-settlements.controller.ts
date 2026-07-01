import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ListSettlementsQueryDto } from "./dto/list-settlements-query.dto";
import { SettlementsService } from "./settlements.service";

const FINANCE_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER];

@ApiTags("Admin Settlements")
@ApiBearerAuth()
@Controller("admin/settlements")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...FINANCE_ADMINS)
export class AdminSettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get("vendors") async vendors(@Query() query: ListSettlementsQueryDto) {
    return { message: "Vendor settlements retrieved", data: await this.settlements.vendorSettlements(query) };
  }
  @Get("vendors/:id") async vendor(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Vendor settlement retrieved", data: await this.settlements.vendorSettlement(id) };
  }
  @Post("vendors/:id/mark-paid") async vendorPaid(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Vendor settlement marked paid", data: await this.settlements.markVendorPaid(user.id, id) };
  }
  @Get("riders") async riders(@Query() query: ListSettlementsQueryDto) {
    return { message: "Rider earnings retrieved", data: await this.settlements.riderEarnings(query) };
  }
  @Get("riders/:id") async rider(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Rider earning retrieved", data: await this.settlements.riderEarning(id) };
  }
  @Post("riders/:id/mark-paid") async riderPaid(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Rider earning marked paid", data: await this.settlements.markRiderPaid(user.id, id) };
  }
}
