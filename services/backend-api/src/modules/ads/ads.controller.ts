import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AdsService } from "./ads.service";
import { CreateAdCampaignDto } from "./dto/create-ad-campaign.dto";
import { CreateAdCreditAdjustmentDto } from "./dto/create-ad-credit-adjustment.dto";
import { UpdateAdCampaignDto } from "./dto/update-ad-campaign.dto";

const AD_MANAGEMENT_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.VENDOR_MANAGER];

@ApiTags("Ads")
@Controller("ads")
export class CustomerAdsController {
  constructor(private readonly ads: AdsService) {}

  @Get("customer-home")
  @ApiOperation({ summary: "List approved customer-home ads for public discovery surfaces" })
  async customerHome() {
    return { message: "Customer home ads retrieved", data: await this.ads.customerHome() };
  }
}

@ApiTags("Vendor Ads")
@ApiBearerAuth()
@Controller("vendor/ads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorAdsController {
  constructor(private readonly ads: AdsService) {}

  @Get()
  @ApiOperation({ summary: "Get vendor ad campaigns and controlled ad credit balance" })
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor ads retrieved", data: await this.ads.vendorDashboard(user.id) };
  }

  @Post()
  @ApiOperation({ summary: "Submit a vendor ad campaign request for admin review" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdCampaignDto) {
    return { message: "Vendor ad campaign submitted", data: await this.ads.vendorCreate(user.id, dto) };
  }
}

@ApiTags("Admin Ads")
@ApiBearerAuth()
@Controller("admin/ads")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...AD_MANAGEMENT_ADMINS)
export class AdminAdsController {
  constructor(private readonly ads: AdsService) {}

  @Get()
  @ApiOperation({ summary: "List ad campaigns for admin review" })
  async list() {
    return { message: "Ad campaigns retrieved", data: await this.ads.adminList() };
  }

  @Post()
  @ApiOperation({ summary: "Create an admin-managed ad campaign" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdCampaignDto) {
    return { message: "Ad campaign created", data: await this.ads.adminCreate(user.id, dto) };
  }

  @Patch(":campaignId")
  @ApiOperation({ summary: "Update an ad campaign review/status record" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateAdCampaignDto
  ) {
    return { message: "Ad campaign updated", data: await this.ads.adminUpdate(user.id, campaignId, dto) };
  }

  @Post("vendor-credit/:vendorId")
  @ApiOperation({ summary: "Grant controlled ad credit to a vendor for pilot ad testing" })
  async grantVendorCredit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("vendorId", ParseUUIDPipe) vendorId: string,
    @Body() dto: CreateAdCreditAdjustmentDto
  ) {
    return { message: "Vendor ad credit granted", data: await this.ads.adminGrantVendorCredit(user.id, vendorId, dto) };
  }
}
