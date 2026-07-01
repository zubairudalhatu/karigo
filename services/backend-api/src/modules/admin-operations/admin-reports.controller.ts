import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminOperationsService } from "./admin-operations.service";
import { ReportDateRangeDto } from "./dto/report-date-range.dto";

const REPORT_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.DISPATCH_OFFICER];

@ApiTags("Admin Reports")
@ApiBearerAuth()
@Controller("admin/reports")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...REPORT_ADMINS)
export class AdminReportsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get("operations")
  async operationsReport(@Query() query: ReportDateRangeDto) {
    return { message: "Operations report retrieved", data: await this.operations.operationsReport(query) };
  }
  @Get("finance")
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER)
  async financeReport(@Query() query: ReportDateRangeDto) {
    return { message: "Finance report retrieved", data: await this.operations.financeReport(query) };
  }
  @Get("vendors")
  async vendorReport() {
    return { message: "Vendor report retrieved", data: await this.operations.vendorReport() };
  }
  @Get("riders")
  async riderReport() {
    return { message: "Rider report retrieved", data: await this.operations.riderReport() };
  }
}
