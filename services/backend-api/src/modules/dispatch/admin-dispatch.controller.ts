import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AssignRiderDto } from "./dto/assign-rider.dto";
import { DispatchService } from "./dispatch.service";

const DISPATCH_ADMIN_ROLES = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.DISPATCH_OFFICER
];

@ApiTags("Admin Dispatch")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...DISPATCH_ADMIN_ROLES)
export class AdminDispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Get("riders/available")
  async availableRiders() {
    return { message: "Available riders retrieved", data: await this.dispatch.availableRiders() };
  }

  @Post("orders/:orderId/assign-rider")
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: AssignRiderDto
  ) {
    return { message: "Rider assigned", data: await this.dispatch.assignRider(user.id, orderId, dto.riderId) };
  }

  @Post("orders/:orderId/reassign-rider")
  async reassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: AssignRiderDto
  ) {
    return { message: "Rider reassigned", data: await this.dispatch.reassignRider(user.id, orderId, dto.riderId) };
  }
}
