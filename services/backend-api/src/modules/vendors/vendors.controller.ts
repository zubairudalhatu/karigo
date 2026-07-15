import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { UpdateVendorServiceDto, VendorServiceInputDto } from "./dto/vendor-service.dto";
import { VendorUploadDto } from "./dto/vendor-upload.dto";
import { VendorsService, VendorUploadedFile } from "./vendors.service";

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

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

  @Post("uploads")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload a vendor-scoped file for onboarding, catalogue images or branding" })
  async uploadFile(@CurrentUser() user: AuthenticatedUser, @Body() dto: VendorUploadDto, @UploadedFile() file?: VendorUploadedFile, @Req() request?: RequestWithHeaders) {
    return { message: "Vendor file uploaded", data: await this.vendorsService.uploadFile(user.id, dto.purpose, file, this.requestBaseUrl(request)) };
  }

  @Get("services")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List authenticated vendor service catalogue entries" })
  async services(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Vendor services retrieved", data: await this.vendorsService.services(user.id) };
  }

  @Post("services")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a vendor service catalogue entry" })
  async createService(@CurrentUser() user: AuthenticatedUser, @Body() dto: VendorServiceInputDto) {
    return { message: "Vendor service created", data: await this.vendorsService.createService(user.id, dto) };
  }

  @Patch("services/:serviceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a vendor service catalogue entry" })
  async updateService(@CurrentUser() user: AuthenticatedUser, @Param("serviceId", ParseUUIDPipe) serviceId: string, @Body() dto: UpdateVendorServiceDto) {
    return { message: "Vendor service updated", data: await this.vendorsService.updateService(user.id, serviceId, dto) };
  }

  @Delete("services/:serviceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Archive a vendor service catalogue entry" })
  async archiveService(@CurrentUser() user: AuthenticatedUser, @Param("serviceId", ParseUUIDPipe) serviceId: string) {
    return { message: "Vendor service archived", data: await this.vendorsService.archiveService(user.id, serviceId) };
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

  private requestBaseUrl(request?: RequestWithHeaders) {
    const rawHost = request?.headers["x-forwarded-host"] ?? request?.headers.host;
    const rawProtocol = request?.headers["x-forwarded-proto"] ?? "https";
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    const protocol = Array.isArray(rawProtocol) ? rawProtocol[0] : rawProtocol;
    return host ? `${protocol}://${host}` : undefined;
  }
}
