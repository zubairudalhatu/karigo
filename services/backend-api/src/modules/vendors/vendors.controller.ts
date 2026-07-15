import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ApplicationDocumentDto } from "../../common/dto/application-document.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { InviteVendorTeamMemberDto, UpdateVendorTeamMemberDto } from "./dto/vendor-team.dto";
import { UpsertVendorBranchDto } from "./dto/vendor-branch.dto";
import { VendorsService } from "./vendors.service";

@ApiTags("Vendors")
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated vendor profile" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor profile retrieved", data: await this.vendorsService.me(user.id) };
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the authenticated vendor profile" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVendorProfileDto) {
    return { message: "Vendor profile updated", data: await this.vendorsService.update(user.id, dto) };
  }

  @Get("team")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List authenticated vendor team members and invitations" })
  async team(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor team retrieved", data: await this.vendorsService.team(user.id) };
  }

  @Post("team")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a safe vendor team invitation without sending email or SMS" })
  async inviteTeamMember(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteVendorTeamMemberDto) {
    return { message: "Vendor team invitation created", data: await this.vendorsService.inviteTeamMember(user.id, dto) };
  }

  @Patch("team/:memberId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a vendor team member role" })
  async updateTeamMember(@CurrentUser() user: AuthenticatedUser, @Param("memberId", ParseUUIDPipe) memberId: string, @Body() dto: UpdateVendorTeamMemberDto) {
    return { message: "Vendor team member updated", data: await this.vendorsService.updateTeamMember(user.id, memberId, dto) };
  }

  @Patch("team/:memberId/revoke")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a pending vendor team invitation" })
  async revokeTeamMember(@CurrentUser() user: AuthenticatedUser, @Param("memberId", ParseUUIDPipe) memberId: string) {
    return { message: "Vendor team invitation revoked", data: await this.vendorsService.revokeTeamMember(user.id, memberId) };
  }

  @Get("branches")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List authenticated vendor branches" })
  async branches(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor branches retrieved", data: await this.vendorsService.branches(user.id) };
  }

  @Post("branches")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a vendor branch/location" })
  async createBranch(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertVendorBranchDto) {
    return { message: "Vendor branch created", data: await this.vendorsService.createBranch(user.id, dto) };
  }

  @Patch("branches/:branchId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a vendor branch/location" })
  async updateBranch(@CurrentUser() user: AuthenticatedUser, @Param("branchId", ParseUUIDPipe) branchId: string, @Body() dto: Partial<UpsertVendorBranchDto>) {
    return { message: "Vendor branch updated", data: await this.vendorsService.updateBranch(user.id, branchId, dto) };
  }

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List authenticated vendor audit logs" })
  async auditLogs(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor audit logs retrieved", data: await this.vendorsService.auditLogs(user.id) };
  }

  @Get("onboarding-documents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List authenticated vendor onboarding documents" })
  async onboardingDocuments(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor onboarding documents retrieved", data: await this.vendorsService.onboardingDocuments(user.id) };
  }

  @Post("onboarding-documents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit vendor onboarding document metadata" })
  async uploadOnboardingDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplicationDocumentDto) {
    return { message: "Vendor onboarding document submitted", data: await this.vendorsService.uploadOnboardingDocument(user.id, dto) };
  }

  @Get()
  @ApiOperation({ summary: "List active vendors" })
  async list(@Query() query: ListVendorsQueryDto) {
    return { message: "Active vendors retrieved", data: await this.vendorsService.listPublic(query) };
  }

  @Get(":vendorId")
  @ApiOperation({ summary: "Get an active vendor" })
  async detail(@Param("vendorId", ParseUUIDPipe) vendorId: string) {
    return { message: "Vendor retrieved", data: await this.vendorsService.publicDetail(vendorId) };
  }
}
