import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CreateParcelOrderDto } from "./dto/create-parcel-order.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Orders")
@ApiBearerAuth()
@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create a basic vendor/product order" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return { message: "Order created", data: await this.ordersService.createVendorOrder(user.id, dto) };
  }

  @Post("quote")
  @ApiOperation({ summary: "Quote a vendor/product order before creation" })
  async quote(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return { message: "Order quote calculated", data: await this.ordersService.quoteVendorOrder(user.id, dto) };
  }

  @Post("parcel")
  @ApiOperation({ summary: "Create a parcel delivery request" })
  async createParcel(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateParcelOrderDto) {
    return { message: "Parcel request created", data: await this.ordersService.createParcelOrder(user.id, dto) };
  }

  @Get("my-orders")
  @ApiOperation({ summary: "List the authenticated customer's orders" })
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Orders retrieved", data: await this.ordersService.listMine(user.id) };
  }

  @Get(":orderId/tracking")
  @ApiOperation({ summary: "Track an owned order by milestone history" })
  async tracking(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Order tracking retrieved", data: await this.ordersService.tracking(user.id, orderId) };
  }

  @Get(":orderId")
  @ApiOperation({ summary: "Get an owned order" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Order retrieved", data: await this.ordersService.detail(user.id, orderId) };
  }
}
