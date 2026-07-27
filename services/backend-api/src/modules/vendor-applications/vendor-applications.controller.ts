import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole, VendorApplicationStatus } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { ReviewVendorApplicationDto } from "./dto/review-vendor-application.dto";
import { VendorApplicationPermanentDeleteDto, VendorApplicationRestoreDto, VendorApplicationTrashDto } from "./dto/vendor-application-cleanup.dto";
import { VendorApplicationStatusQueryDto } from "./dto/vendor-application-status-query.dto";
import { VendorApplicationsService } from "./vendor-applications.service";

const VENDOR_APPLICATION_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.VENDOR_MANAGER];

@ApiTags("Vendor Applications")
@Controller("vendor-applications")
export class PublicVendorApplicationsController {
  constructor(private readonly vendorApplicationsService: VendorApplicationsService) {}

  @Post()
  @ApiOperation({ summary: "Submit a public KariGO vendor application" })
  async create(@Body() dto: CreateVendorApplicationDto) {
    return { message: "Vendor application submitted", data: await this.vendorApplicationsService.create(dto) };
  }

  @Get("status")
  @ApiOperation({ summary: "Look up public vendor application status" })
  async status(@Query() query: VendorApplicationStatusQueryDto) {
    return { message: "Vendor application status retrieved", data: await this.vendorApplicationsService.publicStatus(query) };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get authenticated Partner onboarding state for the central KariGO account" })
  async currentUserStatus(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Partner onboarding state retrieved", data: await this.vendorApplicationsService.currentUserPartnerStatus(user.id) };
  }
}

@ApiTags("Admin Vendor Applications")
@Controller("admin/vendor-applications")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...VENDOR_APPLICATION_ADMINS)
@ApiBearerAuth()
export class AdminVendorApplicationsController {
  constructor(private readonly vendorApplicationsService: VendorApplicationsService) {}

  @Get()
  async list(@Query("status") status?: VendorApplicationStatus, @Query("trash") trash?: "active" | "trashed" | "all") {
    return { message: "Vendor applications retrieved", data: await this.vendorApplicationsService.list(status, trash) };
  }

  @Get("review-queue")
  async reviewQueue() {
    return { message: "Vendor application review queue retrieved", data: await this.vendorApplicationsService.list(VendorApplicationStatus.SUBMITTED) };
  }

  @Get(":applicationId")
  async detail(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Vendor application retrieved", data: await this.vendorApplicationsService.detail(applicationId) };
  }

  @Patch(":applicationId")
  async review(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: ReviewVendorApplicationDto) {
    return { message: "Vendor application reviewed", data: await this.vendorApplicationsService.review(applicationId, user.id, dto) };
  }

  @Patch(":applicationId/trash")
  async trash(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: VendorApplicationTrashDto) {
    return { message: "Vendor application moved to Trash", data: await this.vendorApplicationsService.trash(applicationId, user.id, dto.reason, dto.note) };
  }

  @Patch(":applicationId/restore")
  async restore(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: VendorApplicationRestoreDto) {
    return { message: "Vendor application restored from Trash", data: await this.vendorApplicationsService.restore(applicationId, user.id, dto.reason) };
  }

  @Delete(":applicationId/permanent")
  async permanentlyDelete(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: VendorApplicationPermanentDeleteDto) {
    return { message: "Vendor application permanently deleted", data: await this.vendorApplicationsService.permanentlyDelete(applicationId, user.id, dto.confirmation) };
  }

  @Post(":applicationId/request-changes")
  async requestChanges(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: Partial<ReviewVendorApplicationDto>) {
    return { message: "Vendor application changes requested", data: await this.vendorApplicationsService.review(applicationId, user.id, { status: VendorApplicationStatus.CHANGES_REQUESTED, notes: dto.notes, checklist: dto.checklist }) };
  }

  @Post(":applicationId/provisionally-approve")
  async provisionallyApprove(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: Partial<ReviewVendorApplicationDto>) {
    return { message: "Vendor application provisionally approved", data: await this.vendorApplicationsService.review(applicationId, user.id, { status: VendorApplicationStatus.PROVISIONALLY_APPROVED, notes: dto.notes, checklist: dto.checklist }) };
  }

  @Post(":applicationId/approve")
  async approve(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: Partial<ReviewVendorApplicationDto>) {
    return { message: "Vendor application approved without automatic storefront publication", data: await this.vendorApplicationsService.review(applicationId, user.id, { status: VendorApplicationStatus.APPROVED, notes: dto.notes, checklist: dto.checklist }) };
  }

  @Post(":applicationId/reject")
  async reject(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: Partial<ReviewVendorApplicationDto>) {
    return { message: "Vendor application rejected", data: await this.vendorApplicationsService.review(applicationId, user.id, { status: VendorApplicationStatus.REJECTED, notes: dto.notes, checklist: dto.checklist }) };
  }
}
