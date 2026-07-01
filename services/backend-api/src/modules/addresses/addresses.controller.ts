import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AddressesService } from "./addresses.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";

@ApiTags("Addresses")
@ApiBearerAuth()
@Controller("addresses")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: "Create a customer address" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return { message: "Address created", data: await this.addressesService.create(user.id, dto) };
  }

  @Get()
  @ApiOperation({ summary: "List the customer's addresses" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Addresses retrieved", data: await this.addressesService.list(user.id) };
  }

  @Patch(":addressId/default")
  @ApiOperation({ summary: "Set a customer address as default" })
  async setDefault(@CurrentUser() user: AuthenticatedUser, @Param("addressId", ParseUUIDPipe) addressId: string) {
    return { message: "Default address updated", data: await this.addressesService.setDefault(user.id, addressId) };
  }

  @Patch(":addressId")
  @ApiOperation({ summary: "Update a customer address" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("addressId", ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto
  ) {
    return { message: "Address updated", data: await this.addressesService.update(user.id, addressId, dto) };
  }

  @Delete(":addressId")
  @ApiOperation({ summary: "Delete a customer address" })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("addressId", ParseUUIDPipe) addressId: string) {
    return { message: "Address deleted", data: await this.addressesService.remove(user.id, addressId) };
  }
}
