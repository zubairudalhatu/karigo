import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { PartnerFeeWaiverDto, UpdatePartnerCommercialPolicyDto } from "./dto/update-partner-commercial-policy.dto";
import { PartnerOnboardingPaymentService } from "../payments/partner-onboarding-payment.service";
import { PartnerCommercialService } from "./partner-commercial.service";

@ApiTags("Partner Commercial")
@Controller("partner-commercial")
export class PartnerCommercialController {
  constructor(private readonly commercial: PartnerCommercialService, private readonly onboardingPayments: PartnerOnboardingPaymentService) {}

  @Get("policies")
  async policies() {
    return { message: "Partner commercial policies retrieved", data: await this.commercial.publicPolicies() };
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async own(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Partner commercial state retrieved", data: await this.commercial.ownCommercialState(user.id) };
  }
  @Post("me/onboarding-payments")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async initializePayment(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Partner onboarding payment initialized or recovered", data: await this.onboardingPayments.initialize(user.id) };
  }

  @Get("me/onboarding-payments/:transactionReference/verify")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@CurrentUser() user: AuthenticatedUser, @Param("transactionReference") transactionReference: string) {
    return { message: "Partner onboarding payment verification completed", data: await this.onboardingPayments.verifyOwned(user.id, transactionReference) };
  }
}

@ApiTags("Admin Partner Commercial")
@ApiBearerAuth()

@Controller("admin/partner-commercial")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.VENDOR_MANAGER, AdminRole.OPERATIONS_ADMIN)
export class AdminPartnerCommercialController {
  constructor(private readonly commercial: PartnerCommercialService) {}

  @Get("policies")
  async policies() {
    return { message: "Admin Partner commercial policies retrieved", data: await this.commercial.adminPolicies() };
  }

  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  @Put("policies")
  async updatePolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePartnerCommercialPolicyDto) {
    return { message: "Partner commercial policy version created", data: await this.commercial.updatePolicy(user.id, dto) };
  }

  @Get("applications/:applicationId")
  async application(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Partner application commercial state retrieved", data: await this.commercial.applicationCommercialState(applicationId) };
  }

  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
  @Post("agreements/:agreementId/waive-onboarding-fee")
  async waive(@CurrentUser() user: AuthenticatedUser, @Param("agreementId", ParseUUIDPipe) agreementId: string, @Body() dto: PartnerFeeWaiverDto) {
    return { message: "Partner onboarding fee waiver recorded", data: await this.commercial.waiveFee(user.id, user.adminRole, agreementId, dto) };
  }
}
