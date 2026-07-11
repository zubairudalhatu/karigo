import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateServiceProviderRequestDto } from "./dto/create-service-provider-request.dto";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

@ApiTags("SME Services")
@ApiBearerAuth()
@Controller("service-provider-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class ServiceProviderRequestsController {
  constructor(private readonly serviceRequests: ServiceProviderRequestsService) {}

  @Get("catalogue")
  @ApiOperation({ summary: "List SME Services provider categories" })
  catalogue() {
    return { message: "SME Services catalogue retrieved", data: this.serviceRequests.catalogue() };
  }

  @Post()
  @ApiOperation({ summary: "Create an SME Services provider request" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceProviderRequestDto) {
    return { message: "SME Services request submitted", data: await this.serviceRequests.create(user.id, dto) };
  }

  @Get("my-requests")
  @ApiOperation({ summary: "List the authenticated customer's SME Services requests" })
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    return { message: "SME Services requests retrieved", data: await this.serviceRequests.listMine(user.id) };
  }

  @Get(":requestId")
  @ApiOperation({ summary: "Get an owned SME Services request" })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param("requestId", ParseUUIDPipe) requestId: string) {
    return { message: "SME Services request retrieved", data: await this.serviceRequests.detail(user.id, requestId) };
  }
}
