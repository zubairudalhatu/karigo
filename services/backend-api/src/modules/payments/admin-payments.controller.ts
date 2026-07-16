import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { PaymentsService } from "./payments.service";

@ApiTags("Admin Payments")
@ApiBearerAuth()
@Controller("admin/payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("provider-readiness")
  @ApiOperation({ summary: "Inspect safe payment provider configuration readiness" })
  async providerReadiness(): Promise<{ message: string; data: unknown }> {
    return {
      message: "Payment provider readiness retrieved",
      data: this.paymentsService.providerReadiness()
    };
  }

  @Post(":paymentId/approve-refund")
  @ApiOperation({ summary: "Approve a pending refund request" })
  async approveRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId", ParseUUIDPipe) paymentId: string
  ) {
    return { message: "Refund approved", data: await this.paymentsService.approveRefund(user.id, paymentId) };
  }
}
