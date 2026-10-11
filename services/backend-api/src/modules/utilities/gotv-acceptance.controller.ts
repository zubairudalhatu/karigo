import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsString, Matches } from "class-validator";
import { ApiExcludeController } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { GotvAcceptanceService } from "./gotv-acceptance.service";

class GotvAccountDto {
  @IsString() @Matches(/^\d{6,20}$/) recipient!: string;
}
class GotvQuoteDto extends GotvAccountDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) productId!: string;
}

@Controller("customer/utilities/acceptance/gotv")
@ApiExcludeController()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class GotvAcceptanceController {
  constructor(private readonly acceptance: GotvAcceptanceService) {}
  @Get() async access(@CurrentUser() user: AuthenticatedUser) { return { data: await this.acceptance.access(user.id) }; }
  @Post("validate") async validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GotvAccountDto) { return { data: await this.acceptance.validate(user.id, dto.recipient) }; }
  @Post("quote") async quote(@CurrentUser() user: AuthenticatedUser, @Body() dto: GotvQuoteDto) { return { data: await this.acceptance.quote(user.id, dto.recipient, dto.productId) }; }
  // Intentionally no payment/transaction endpoint.
}
