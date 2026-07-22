import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateUtilityTransactionDto, UtilityQuoteDto } from "./dto/customer-utility.dto";
import { ListUtilityTransactionsQueryDto } from "./dto/list-utility-transactions-query.dto";
import { UtilitiesService } from "./utilities.service";

@ApiTags("Customer Utilities")
@ApiBearerAuth()
@Controller("customer/utilities")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerUtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Post("quote")
  @ApiOperation({ summary: "Create a safe test-mode utility quote" })
  async quote(@CurrentUser() user: AuthenticatedUser, @Body() dto: UtilityQuoteDto) {
    return { message: "Utility quote calculated", data: await this.utilities.quote(user.id, dto) };
  }

  @Post("transactions")
  @ApiOperation({ summary: "Create a Bills & Utilities transaction" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUtilityTransactionDto) {
    return { message: "Utility transaction created", data: await this.utilities.createTransaction(user.id, dto) };
  }

  @Get("transactions")
  @ApiOperation({ summary: "List the authenticated customer's utility transactions" })
  async listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUtilityTransactionsQueryDto) {
    return { message: "Utility transactions retrieved", data: await this.utilities.listMine(user.id, query) };
  }

  @Get("transactions/:transactionId")
  @ApiOperation({ summary: "Get an owned utility transaction receipt" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("transactionId", ParseUUIDPipe) transactionId: string) {
    return { message: "Utility transaction retrieved", data: await this.utilities.customerDetail(user.id, transactionId) };
  }

  @Post("transactions/:transactionId/cancel")
  @ApiOperation({ summary: "Cancel an eligible pending utility transaction" })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("transactionId", ParseUUIDPipe) transactionId: string) {
    return { message: "Utility transaction cancelled", data: await this.utilities.cancel(user.id, transactionId) };
  }
}
