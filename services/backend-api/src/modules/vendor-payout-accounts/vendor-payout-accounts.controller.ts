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
import { ListVendorPayoutAccountsQueryDto } from "./dto/list-vendor-payout-accounts-query.dto";
import { ReviewVendorPayoutAccountDto } from "./dto/review-vendor-payout-account.dto";
import { UpsertVendorPayoutAccountDto } from "./dto/upsert-vendor-payout-account.dto";
import { VendorPayoutAccountsService } from "./vendor-payout-accounts.service";

const PAYOUT_ACCOUNT_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.VENDOR_MANAGER];

@ApiTags("Vendor Payout Accounts")
@ApiBearerAuth()
@Controller("vendor/payout-account")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorPayoutAccountsController {
  constructor(private readonly payoutAccounts: VendorPayoutAccountsService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated vendor's payout account summary" })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor payout account retrieved", data: await this.payoutAccounts.getVendorAccount(user.id) };
  }

  @Post()
  @ApiOperation({ summary: "Create payout details for the authenticated vendor" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertVendorPayoutAccountDto) {
    return { message: "Vendor payout account submitted for verification", data: await this.payoutAccounts.createVendorAccount(user.id, dto) };
  }

  @Patch()
  @ApiOperation({ summary: "Update payout details for the authenticated vendor" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertVendorPayoutAccountDto) {
    return { message: "Vendor payout account updated and submitted for verification", data: await this.payoutAccounts.updateVendorAccount(user.id, dto) };
  }
}

@ApiTags("Admin Vendor Payout Accounts")
@ApiBearerAuth()
@Controller("admin/vendor-payout-accounts")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...PAYOUT_ACCOUNT_ADMINS)
export class AdminVendorPayoutAccountsController {
  constructor(private readonly payoutAccounts: VendorPayoutAccountsService) {}

  @Get()
  @ApiOperation({ summary: "List vendor payout accounts for admin review" })
  async list(@Query() query: ListVendorPayoutAccountsQueryDto) {
    return { message: "Vendor payout accounts retrieved", data: await this.payoutAccounts.adminList(query) };
  }

  @Get(":payoutAccountId")
  @ApiOperation({ summary: "Get one vendor payout account for admin review" })
  async detail(@Param("payoutAccountId", ParseUUIDPipe) payoutAccountId: string) {
    return { message: "Vendor payout account retrieved", data: await this.payoutAccounts.adminDetail(payoutAccountId) };
  }

  @Patch(":payoutAccountId/review")
  @ApiOperation({ summary: "Review a vendor payout account" })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("payoutAccountId", ParseUUIDPipe) payoutAccountId: string,
    @Body() dto: ReviewVendorPayoutAccountDto
  ) {
    return { message: "Vendor payout account reviewed", data: await this.payoutAccounts.adminReview(user.id, payoutAccountId, dto) };
  }
}
