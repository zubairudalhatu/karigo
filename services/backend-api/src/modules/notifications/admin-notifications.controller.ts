import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ListAdminNotificationsQueryDto } from "./dto/list-admin-notifications-query.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Admin Notifications")
@ApiBearerAuth()
@Controller("admin/notifications")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() async list(@Query() query: ListAdminNotificationsQueryDto) {
    return { message: "Platform notifications retrieved", data: await this.notifications.adminList(query) };
  }
}
