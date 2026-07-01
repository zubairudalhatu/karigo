import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ValidatePromoDto } from "./dto/validate-promo.dto";
import { PromoService } from "./promo.service";

@ApiTags("Promos")
@ApiBearerAuth()
@Controller("promos")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class PromoController {
  constructor(private readonly promos: PromoService) {}

  @Post("validate")
  async validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidatePromoDto) {
    return { message: "Promo code validated", data: await this.promos.validate(user.id, dto) };
  }
}
