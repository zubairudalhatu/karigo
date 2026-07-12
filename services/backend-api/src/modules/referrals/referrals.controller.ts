import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateReferralRewardRuleDto } from "./dto/create-referral-reward-rule.dto";
import { ListReferralsQueryDto } from "./dto/list-referrals-query.dto";
import { ListRewardRulesQueryDto } from "./dto/list-reward-rules-query.dto";
import { ReviewReferralDto } from "./dto/review-referral.dto";
import { UpdateReferralRewardRuleDto } from "./dto/update-referral-reward-rule.dto";
import { ReferralsService } from "./referrals.service";

const REFERRAL_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.MARKETING_MANAGER,
  AdminRole.FINANCE_OFFICER
];

@ApiTags("Customer Referrals")
@ApiBearerAuth()
@Controller("referrals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated customer's referral profile" })
  async profile(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Referral profile retrieved", data: await this.referrals.customerProfile(user.id) };
  }

  @Get("my-referrals")
  @ApiOperation({ summary: "List the authenticated customer's referral records" })
  async myReferrals(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Customer referrals retrieved", data: await this.referrals.customerReferrals(user.id) };
  }
}

@ApiTags("Admin Referrals")
@ApiBearerAuth()
@Controller("admin/referrals")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...REFERRAL_ADMINS)
export class AdminReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  @ApiOperation({ summary: "List referral records for admin review" })
  async list(@Query() query: ListReferralsQueryDto) {
    return { message: "Referral records retrieved", data: await this.referrals.adminList(query) };
  }

  @Get("reward-rules")
  @ApiOperation({ summary: "List referral reward rules" })
  async rewardRules(@Query() query: ListRewardRulesQueryDto) {
    return { message: "Referral reward rules retrieved", data: await this.referrals.adminRewardRules(query) };
  }

  @Post("reward-rules")
  @ApiOperation({ summary: "Create a referral reward rule without activating fulfillment" })
  async createRewardRule(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReferralRewardRuleDto) {
    return { message: "Referral reward rule created", data: await this.referrals.adminCreateRewardRule(user.id, dto) };
  }

  @Patch("reward-rules/:ruleId")
  @ApiOperation({ summary: "Update a referral reward rule without issuing rewards" })
  async updateRewardRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("ruleId", ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateReferralRewardRuleDto
  ) {
    return { message: "Referral reward rule updated", data: await this.referrals.adminUpdateRewardRule(user.id, ruleId, dto) };
  }

  @Get(":referralId")
  @ApiOperation({ summary: "Get one referral record for admin qualification review" })
  async detail(@Param("referralId", ParseUUIDPipe) referralId: string) {
    return { message: "Referral record retrieved", data: await this.referrals.adminDetail(referralId) };
  }

  @Patch(":referralId/review")
  @ApiOperation({ summary: "Record an admin referral review decision without issuing rewards" })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("referralId", ParseUUIDPipe) referralId: string,
    @Body() dto: ReviewReferralDto
  ) {
    return { message: "Referral review decision saved", data: await this.referrals.adminReview(user.id, referralId, dto) };
  }
}
