import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AddTicketMessageDto } from "./dto/add-ticket-message.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { SupportService } from "./support.service";

@ApiTags("Support")
@ApiBearerAuth()
@Controller("support/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return { message: "Support ticket created", data: await this.support.create(user.id, dto) };
  }

  @Get("my-tickets")
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Support tickets retrieved", data: await this.support.myTickets(user.id) };
  }

  @Get(":ticketId")
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("ticketId", ParseUUIDPipe) ticketId: string) {
    return { message: "Support ticket retrieved", data: await this.support.customerDetail(user.id, ticketId) };
  }

  @Post(":ticketId/messages")
  async message(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @Body() dto: AddTicketMessageDto
  ) {
    return { message: "Support message added", data: await this.support.customerMessage(user.id, ticketId, dto) };
  }
}
