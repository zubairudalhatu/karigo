import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { RecordAdEventDto } from "./dto/record-ad-event.dto";
import { GetCustomerAdsQueryDto } from "./dto/get-customer-ads-query.dto";
import { GetAdPerformanceQueryDto } from "./dto/get-ad-performance-query.dto";
import { TransitionAdCampaignDto } from "./dto/transition-ad-campaign.dto";
import { AD_CREATIVE_MAX_BYTES, AdCreativeService } from "./ad-creative.service";

const AD_MANAGEMENT_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.VENDOR_MANAGER];

@ApiTags("Ads")
@ApiBearerAuth()
@Controller("ads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerAdsController {
  constructor(private readonly ads: AdsService, private readonly creative: AdCreativeService) {}

  @Get("customer-home")
  @ApiOperation({ summary: "List approved customer-home ads for public discovery surfaces" })
  async customerHome(@CurrentUser() user: AuthenticatedUser, @Query() query: GetCustomerAdsQueryDto) {
    return { message: "Customer home ads retrieved", data: await this.ads.customerHome(user.id, query.serviceCategory) };
  }

  @Post(":campaignId/events")
  @ApiOperation({ summary: "Record a privacy-safe ad render or click event" })
  async recordEvent(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordAdEventDto
  ) {
    return { message: "Ad event accepted", data: await this.ads.recordEvent(user.id, campaignId, dto) };
  }

  @Get("creative/:assetId")
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN)
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @ApiOperation({ summary: "Serve an approved active ad creative" })
  async approvedCreative(@Param("assetId", ParseUUIDPipe) assetId: string, @CurrentUser() user: AuthenticatedUser) {
    const asset = await this.creative.readForActor(assetId, user);
    return new StreamableFile(asset.buffer, { type: asset.mimeType });
  }
}

@ApiTags("Vendor Ads")
@ApiBearerAuth()
@Controller("vendor/ads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorAdsController {
  constructor(private readonly ads: AdsService, private readonly creative: AdCreativeService) {}

  @Get()
  @ApiOperation({ summary: "Get vendor ad campaigns and controlled ad credit balance" })
  async dashboard(@CurrentUser() user: AuthenticatedUser, @Query() query: GetAdPerformanceQueryDto) {
    return { message: "Vendor ads retrieved", data: await this.ads.vendorDashboard(user.id, query) };
  }

  @Post()
  @ApiOperation({ summary: "Submit a vendor ad campaign request for admin review" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdCampaignDto) {
    return { message: "Vendor ad campaign draft created", data: await this.ads.vendorCreate(user.id, dto) };
  }

  @Patch(":campaignId")
  @ApiOperation({ summary: "Edit a vendor-owned campaign or create a replacement revision" })
  async update(@CurrentUser() user: AuthenticatedUser, @Param("campaignId", ParseUUIDPipe) campaignId: string, @Body() dto: UpdateAdCampaignDto) {
    return { message: "Vendor ad campaign updated", data: await this.ads.vendorUpdate(user.id, campaignId, dto) };
  }

  @Post(":campaignId/actions")
  @ApiOperation({ summary: "Perform a governed vendor campaign action" })
  async transition(@CurrentUser() user: AuthenticatedUser, @Param("campaignId", ParseUUIDPipe) campaignId: string, @Body() dto: TransitionAdCampaignDto) {
    return { message: "Vendor campaign action completed", data: await this.ads.vendorTransition(user.id, campaignId, dto) };
  }

  @Post(":campaignId/creative")
  @UseInterceptors(FileInterceptor("creative", { limits: { fileSize: AD_CREATIVE_MAX_BYTES, files: 1 } }))
  @ApiOperation({ summary: "Upload a validated creative for the current campaign revision" })
  async uploadCreative(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined
  ) {
    if (!file) throw new BadRequestException("Select a JPEG or PNG creative image.");
    return { message: "Creative uploaded", data: await this.creative.saveForVendor(user.id, campaignId, file) };
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
  async list(@Query() query: GetAdPerformanceQueryDto) {
    return { message: "Ad campaigns retrieved", data: await this.ads.adminList(query) };
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

  @Post(":campaignId/actions")
  @ApiOperation({ summary: "Perform a governed administrative campaign action" })
  async transition(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Body() dto: TransitionAdCampaignDto
  ) {
    return { message: "Ad campaign action completed", data: await this.ads.adminTransition(user.id, campaignId, dto) };
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
