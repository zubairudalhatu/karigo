import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreatePromoDto } from "./dto/create-promo.dto";
import { UpdatePromoDto } from "./dto/update-promo.dto";
import { PromoService } from "./promo.service";

const PROMO_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.MARKETING_MANAGER];

@ApiTags("Admin Promos")
@ApiBearerAuth()
@Controller("admin/promos")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...PROMO_ADMINS)
export class AdminPromoController {
  constructor(private readonly promos: PromoService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePromoDto) {
    return { message: "Promo code created", data: await this.promos.create(user.id, dto) };
  }
  @Get() async list() {
    return { message: "Promo codes retrieved", data: await this.promos.list() };
  }
  @Get(":id") async detail(@Param("id", ParseUUIDPipe) id: string) {
    return { message: "Promo code retrieved", data: await this.promos.detail(id) };
  }
  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePromoDto) {
    return { message: "Promo code updated", data: await this.promos.update(user.id, id, dto) };
  }
  @Patch(":id/deactivate")
  async deactivate(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return { message: "Promo code deactivated", data: await this.promos.deactivate(user.id, id) };
  }
}
