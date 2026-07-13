import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateDeliveryCaptainApplicationDto } from "./dto/create-delivery-captain-application.dto";
import { DeliveryCaptainApplicationStatusQueryDto } from "./dto/delivery-captain-application-status-query.dto";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";
import { RidersService } from "./riders.service";

@ApiTags("Delivery Captain Applications")
@Controller("delivery-captain-applications")
export class DeliveryCaptainApplicationsController {
  constructor(private readonly ridersService: RidersService) {}

  @Post()
  @ApiOperation({ summary: "Submit a public Delivery Captain application for Kano pilot review" })
  async create(@Body() dto: CreateDeliveryCaptainApplicationDto) {
    return { message: "Delivery Captain application submitted", data: await this.ridersService.createDeliveryCaptainApplication(dto) };
  }

  @Get("status")
  @ApiOperation({ summary: "Check public Delivery Captain application status by phone number" })
  async status(@Query() query: DeliveryCaptainApplicationStatusQueryDto) {
    return { message: "Delivery Captain application status retrieved", data: await this.ridersService.deliveryCaptainApplicationStatus(query) };
  }
}

@ApiTags("Riders")
@ApiBearerAuth()
@Controller("riders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated rider profile" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Rider profile retrieved", data: await this.ridersService.me(user.id) };
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the authenticated rider profile" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRiderProfileDto) {
    return { message: "Rider profile updated", data: await this.ridersService.update(user.id, dto) };
  }
}
