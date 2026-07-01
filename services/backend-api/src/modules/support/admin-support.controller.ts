import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AddTicketMessageDto } from "./dto/add-ticket-message.dto";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { ListSupportTicketsQueryDto } from "./dto/list-support-tickets-query.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { SupportService } from "./support.service";

const SUPPORT_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT];

@ApiTags("Admin Support")
@ApiBearerAuth()
@Controller("admin/support/tickets")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...SUPPORT_ADMINS)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  async list(@Query() query: ListSupportTicketsQueryDto) {
    return { message: "Support tickets retrieved", data: await this.support.adminList(query) };
  }

  @Get(":ticketId")
  async detail(@Param("ticketId", ParseUUIDPipe) ticketId: string) {
    return { message: "Support ticket retrieved", data: await this.support.adminDetail(ticketId) };
  }

  @Post(":ticketId/assign")
  async assign(@CurrentUser() user: AuthenticatedUser, @Param("ticketId", ParseUUIDPipe) ticketId: string, @Body() dto: AssignTicketDto) {
    return { message: "Support ticket assigned", data: await this.support.assign(user.id, ticketId, dto) };
  }

  @Patch(":ticketId/status")
  async status(@CurrentUser() user: AuthenticatedUser, @Param("ticketId", ParseUUIDPipe) ticketId: string, @Body() dto: UpdateTicketStatusDto) {
    return { message: "Support ticket status updated", data: await this.support.updateStatus(user.id, ticketId, dto) };
  }

  @Post(":ticketId/messages")
  async message(@CurrentUser() user: AuthenticatedUser, @Param("ticketId", ParseUUIDPipe) ticketId: string, @Body() dto: AddTicketMessageDto) {
    return { message: "Support message added", data: await this.support.adminMessage(user.id, ticketId, dto) };
  }
}
