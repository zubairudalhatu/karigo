import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ListVendorOrdersQueryDto } from "./dto/list-vendor-orders-query.dto";
import { RejectVendorOrderDto } from "./dto/reject-vendor-order.dto";
import { VendorDashboardOrdersService } from "./vendor-dashboard-orders.service";

@ApiTags("Vendor Dashboard Orders")
@ApiBearerAuth()
@Controller("vendor-dashboard/orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorDashboardOrdersController {
  constructor(private readonly ordersService: VendorDashboardOrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders belonging to the authenticated vendor" })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListVendorOrdersQueryDto) {
    return { message: "Vendor orders retrieved", data: await this.ordersService.list(user.id, query) };
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Get an order belonging to the authenticated vendor" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Vendor order retrieved", data: await this.ordersService.detail(user.id, orderId) };
  }

  @Post(":orderId/accept")
  @ApiOperation({ summary: "Accept a paid vendor order" })
  async accept(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Order accepted", data: await this.ordersService.accept(user.id, orderId) };
  }

  @Post(":orderId/reject")
  @ApiOperation({ summary: "Reject a paid vendor order" })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: RejectVendorOrderDto
  ) {
    return {
      message: "Order rejected; paid orders require refund review",
      data: await this.ordersService.reject(user.id, orderId, dto)
    };
  }

  @Post(":orderId/preparing")
  @ApiOperation({ summary: "Mark an accepted order as preparing" })
  async preparing(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Order marked as preparing", data: await this.ordersService.preparing(user.id, orderId) };
  }

  @Post(":orderId/ready")
  @ApiOperation({ summary: "Mark a preparing order as ready for pickup" })
  async ready(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Order ready for pickup", data: await this.ordersService.ready(user.id, orderId) };
  }
}
