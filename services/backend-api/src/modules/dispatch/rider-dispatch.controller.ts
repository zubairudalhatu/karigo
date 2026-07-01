import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CompleteRiderJobDto } from "./dto/complete-rider-job.dto";
import { RejectRiderJobDto } from "./dto/reject-rider-job.dto";
import { UpdateRiderAvailabilityDto } from "./dto/update-rider-availability.dto";
import { UpdateRiderJobStatusDto } from "./dto/update-rider-job-status.dto";
import { UpdateRiderLocationDto } from "./dto/update-rider-location.dto";
import { DispatchService } from "./dispatch.service";

@ApiTags("Rider Dispatch")
@ApiBearerAuth()
@Controller("rider")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
export class RiderDispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Patch("availability")
  @ApiOperation({ summary: "Set authenticated rider online or offline" })
  async availability(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRiderAvailabilityDto) {
    return { message: "Rider availability updated", data: await this.dispatch.updateAvailability(user.id, dto) };
  }

  @Patch("location")
  @ApiOperation({ summary: "Store authenticated rider's last known location" })
  async location(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRiderLocationDto) {
    return { message: "Rider location updated", data: await this.dispatch.updateLocation(user.id, dto) };
  }

  @Get("jobs")
  async jobs(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Rider jobs retrieved", data: await this.dispatch.riderJobs(user.id) };
  }

  @Get("jobs/:orderId")
  async job(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Rider job retrieved", data: await this.dispatch.riderJob(user.id, orderId) };
  }

  @Post("jobs/:orderId/accept")
  async accept(@CurrentUser() user: AuthenticatedUser, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return { message: "Rider job accepted", data: await this.dispatch.acceptJob(user.id, orderId) };
  }

  @Post("jobs/:orderId/reject")
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: RejectRiderJobDto
  ) {
    return {
      message: "Rider job rejected; admin reassignment is required",
      data: await this.dispatch.rejectJob(user.id, orderId, dto)
    };
  }

  @Post("jobs/:orderId/status")
  async status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateRiderJobStatusDto
  ) {
    return { message: "Delivery status updated", data: await this.dispatch.updateJobStatus(user.id, orderId, dto) };
  }

  @Post("jobs/:orderId/complete")
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: CompleteRiderJobDto
  ) {
    return { message: "Delivery completed", data: await this.dispatch.completeJob(user.id, orderId, dto) };
  }

  @Get("earnings")
  async earnings(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Rider earnings retrieved", data: await this.dispatch.earnings(user.id) };
  }
}
