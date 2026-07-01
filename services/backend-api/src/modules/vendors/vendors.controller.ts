import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { VendorsService } from "./vendors.service";

@ApiTags("Vendors")
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated vendor profile" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor profile retrieved", data: await this.vendorsService.me(user.id) };
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated vendor profile" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVendorProfileDto) {
    return { message: "Vendor profile updated", data: await this.vendorsService.update(user.id, dto) };
  }

  @Get()
  @ApiOperation({ summary: "List active vendors" })
  async list(@Query() query: ListVendorsQueryDto) {
    return { message: "Active vendors retrieved", data: await this.vendorsService.listPublic(query) };
  }

  @Get(":vendorId")
  @ApiOperation({ summary: "Get an active vendor" })
  async detail(@Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return { message: "Vendor retrieved", data: await this.vendorsService.publicDetail(vendorId) };
  }
}
