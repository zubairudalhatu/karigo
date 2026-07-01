import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AdminOperationsService } from "./admin-operations.service";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { OrderStatusNoteDto } from "./dto/order-status-note.dto";

const OPS_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.DISPATCH_OFFICER];

@ApiTags("Admin Operations")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...OPS_ADMINS)
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get("dashboard") dashboard() {
    return this.operations.dashboard().then((data) => ({ message: "Admin dashboard retrieved", data }));
  }
  @Get("orders") orders(@Query() query: ListAdminOrdersQueryDto) {
    return this.operations.orders(query).then((data) => ({ message: "Admin orders retrieved", data }));
  }
  @Get("orders/:orderId") order(@Param("orderId", ParseUUIDPipe) orderId: string) {
    return this.operations.order(orderId).then((data) => ({ message: "Admin order retrieved", data }));
  }
  @Patch("orders/:orderId/status-note")
  async note(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string, @Body() dto: OrderStatusNoteDto) {
    return { message: "Order status note added", data: await this.operations.orderNote(user.id, orderId, dto.note) };
  }
  @Get("users") users() {
    return this.operations.users().then((data) => ({ message: "Users retrieved", data }));
  }
  @Get("vendors") vendors() {
    return this.operations.vendors().then((data) => ({ message: "Vendors retrieved", data }));
  }
  @Get("riders") riders() {
    return this.operations.riders().then((data) => ({ message: "Riders retrieved", data }));
  }
}
