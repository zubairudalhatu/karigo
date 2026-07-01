import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PromoService } from "./promo.service";

@ApiTags("Admin Promo Reports")
@ApiBearerAuth()
@Controller("admin/reports/promos")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.MARKETING_MANAGER)
export class AdminPromoReportController {
  constructor(private readonly promos: PromoService) {}
  @Get() async report() {
    return { message: "Promo report retrieved", data: await this.promos.report() };
  }
}
