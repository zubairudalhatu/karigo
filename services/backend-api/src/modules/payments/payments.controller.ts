import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("public-config")
  @ApiOperation({ summary: "Retrieve public-safe customer payment configuration" })
  publicConfig() {
    return { message: "Payment configuration retrieved", data: this.paymentsService.publicPaymentConfig() };
  }

  @Post("initiate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate payment for an owned order" })
  async initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return { message: "Payment initiated", data: await this.paymentsService.initiate(user.id, dto) };
  }

  @Get("verify/:transactionReference")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify a customer payment" })
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param("transactionReference") transactionReference: string
  ) {
    return {
      message: "Payment verification completed",
      data: await this.paymentsService.verify(user.id, transactionReference)
    };
  }

  @Post("webhook/:gateway")
  @ApiOperation({ summary: "Receive a payment gateway webhook" })
  async webhook(
    @Param("gateway") gateway: string,
    @Body() payload: Record<string, unknown>,
    @Headers("x-paystack-signature") paystackSignature: string | undefined,
    @Headers("monnify-signature") monnifySignature: string | undefined,
    @Headers("x-squad-encrypted-body") squadSignature: string | undefined,
    @Req() request: RawBodyRequest<Request>
  ) {
    return {
      message: "Webhook received",
      data: await this.paymentsService.webhook(gateway, payload, {
        rawBody: request.rawBody,
        signature: paystackSignature ?? monnifySignature ?? squadSignature
      })
    };
  }

  @Post(":paymentId/refund-request")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Request a refund for an owned successful payment" })
  async requestRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param("paymentId", ParseUUIDPipe) paymentId: string
  ) {
    return { message: "Refund requested", data: await this.paymentsService.requestRefund(user.id, paymentId) };
  }
}
