import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CustomersService } from "./customers.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";

@ApiTags("Customers")
@ApiBearerAuth()
@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated customer profile" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: "Customer profile retrieved",
      data: await this.customersService.me(user.id)
    };
  }

  @Get("me/retention-summary")
  @ApiOperation({ summary: "Get authenticated customer's retention summary" })
  async retentionSummary(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: "Customer retention summary retrieved",
      data: await this.customersService.retentionSummary(user.id)
    };
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the authenticated customer profile" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCustomerProfileDto) {
    return {
      message: "Customer profile updated",
      data: await this.customersService.update(user.id, dto)
    };
  }
}
