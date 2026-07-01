import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { DeviceTokensService } from "./device-tokens.service";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly deviceTokens: DeviceTokensService
  ) {}
  @Get() async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return { message: "Notifications retrieved", data: await this.notifications.listMine(user.id, query) };
  }
  @Get("unread-count") async unread(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Unread notification count retrieved", data: await this.notifications.unreadCount(user.id) };
  }
  @Patch("read-all") async readAll(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Notifications marked read", data: await this.notifications.markAllRead(user.id) };
  }
  @Patch(":id/read") async read(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Notification marked read", data: await this.notifications.markRead(user.id, id) };
  }

  @Post("device-tokens")
  @ApiOperation({ summary: "Register or refresh an authenticated user's push device token" })
  async registerDeviceToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceTokenDto) {
    return { message: "Device token registered", data: await this.deviceTokens.register(user.id, user.role, dto) };
  }

  @Get("device-tokens")
  @ApiOperation({ summary: "List the authenticated user's active push devices" })
  async listDeviceTokens(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Device tokens retrieved", data: await this.deviceTokens.listMine(user.id) };
  }

  @Delete("device-tokens/:id")
  @ApiOperation({ summary: "Deactivate one of the authenticated user's push device tokens" })
  async deleteDeviceToken(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Device token deactivated", data: await this.deviceTokens.deactivate(user.id, id) };
  }
}
