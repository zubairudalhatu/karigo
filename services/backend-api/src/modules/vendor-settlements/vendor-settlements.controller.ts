import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ListVendorSettlementsQueryDto } from "./dto/list-vendor-settlements-query.dto";
import { VendorSettlementsService } from "./vendor-settlements.service";

@ApiTags("Vendor Settlements")
@ApiBearerAuth()
@Controller("vendor/settlements")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorSettlementsController {
  constructor(private readonly settlements: VendorSettlementsService) {}

  @Get()
  @ApiOperation({ summary: "List settlements belonging to the authenticated vendor" })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListVendorSettlementsQueryDto) {
    return { message: "Vendor settlements retrieved", data: await this.settlements.list(user.id, query) };
  }
}
