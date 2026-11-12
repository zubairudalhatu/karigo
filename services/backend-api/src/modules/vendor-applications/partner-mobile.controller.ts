import { UserRole, AdminRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsBoolean, IsIn, IsString, Length, MaxLength, Matches, IsOptional } from "class-validator";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { PartnerOnboardingGuard, PartnerPrincipal } from "../auth/partner-session";
import { PartnerOnboardingDraftDto } from "./dto/partner-onboarding-draft.dto";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { VendorApplicationsService } from "./vendor-applications.service";
import { PartnerMobileFilesService } from "./partner-mobile-files.service";
import { PrivateVendorFile } from "../vendors/vendor-private-upload-storage.service";
class PartnerDocumentDto {
  @IsString() @MaxLength(80) documentType!: string;
  @IsString() @Matches(/^\/partner-mobile\/onboarding\/files\/[0-9a-f-]{36}$/i) documentUrl!: string;
  @IsOptional() @IsString() @MaxLength(120) documentName?: string;
}
import { PartnerPushService } from "../notifications/partner-push.service";

class PreferencesDto { @IsBoolean() enabled!: boolean; @IsBoolean() orders!: boolean; @IsBoolean() settlements!: boolean; }
class PartnerDeviceDto { @IsString() @Length(10, 2048) token!: string; @IsIn(["IOS", "ANDROID"]) platform!: "IOS" | "ANDROID"; }

@Controller("partner-mobile/onboarding")
@UseGuards(PartnerOnboardingGuard)
export class PartnerMobileOnboardingController {
  constructor(private readonly applications: VendorApplicationsService, private readonly files: PartnerMobileFilesService) {}
  @Post("ensure") async ensure(@CurrentUser() user: PartnerPrincipal) { return { data: await this.applications.ensurePartnerApplicant(user.id, user.partnerScope === "onboarding") }; }
  @Get("status") async status(@CurrentUser() user: PartnerPrincipal) {
    const state = await this.applications.ensurePartnerApplicant(user.id, user.partnerScope === "onboarding");
    if (!user.partnerScope) return { data: await this.applications.currentUserPartnerStatus(user.id) };
    return { data: { ...state, authenticated: true, state: state.state === "approved" ? "restricted" : state.state, message: state.state === "approved" ? "Approval is complete. Sign out and sign back in to obtain approved Partner authorization." : state.message } };
  }
  @Patch("draft") async draft(@CurrentUser() user: PartnerPrincipal, @Body() body: PartnerOnboardingDraftDto) {
    return { data: await this.applications.savePartnerOnboardingDraft(user.id, body, user.partnerScope === "onboarding") };
  }
  @Post("submit") async submit(@CurrentUser() user: PartnerPrincipal, @Body() body: CreateVendorApplicationDto) {
    for (const document of body.documents ?? []) await this.files.label(user.id, document.documentUrl, document.documentType, document.documentName);
    return { data: await this.applications.submitForCurrentUser(user.id, body, user.partnerScope === "onboarding") };
  }
  @Post("files") @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async upload(@CurrentUser() user: PartnerPrincipal, @UploadedFile() file?: PrivateVendorFile) { return { data: await this.files.upload(user.id, file) }; }
  @Get("files") async list(@CurrentUser() user: PartnerPrincipal) { return { data: await this.files.list(user.id) }; }
  @Post("documents") async label(@CurrentUser() user: PartnerPrincipal, @Body() body: PartnerDocumentDto) { return { data: await this.files.label(user.id, body.documentUrl, body.documentType, body.documentName) }; }
  @Get("files/:id") async read(@CurrentUser() user: PartnerPrincipal, @Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.files.read(user.id, id);
    res.set({ "Content-Type": file.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }); res.send(file.buffer);
  }
  @Delete("files/:id") async remove(@CurrentUser() user: PartnerPrincipal, @Param("id", ParseUUIDPipe) id: string) { return { data: await this.files.remove(user.id, id) }; }
}

@Controller("partner-mobile/push")
@UseGuards(JwtAuthGuard)
export class PartnerMobilePushController {
  constructor(private readonly push: PartnerPushService) {}
  @Get("preferences") async preferences(@CurrentUser() user: AuthenticatedUser) { return { data: await this.push.preferences(user.id) }; }
  @Patch("preferences") async update(@CurrentUser() user: AuthenticatedUser, @Body() body: PreferencesDto) { return { data: await this.push.setPreferences(user.id, body.enabled, body.orders, body.settlements) }; }
  @Post("device") async register(@CurrentUser() user: AuthenticatedUser, @Body() body: PartnerDeviceDto) { return { data: await this.push.register(user.id, body.token, body.platform) }; }
  @Delete("device") async unregister(@CurrentUser() user: AuthenticatedUser, @Body() body: PartnerDeviceDto) { return { data: await this.push.unregister(user.id, body.token) }; }
}

@Controller("admin/partner-onboarding/files")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN) @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.VENDOR_MANAGER)
export class PartnerMobileFileReviewController {
  constructor(private readonly files: PartnerMobileFilesService) {}
  @Post("applications/:id/withdrawn-cleanup") async cleanup(@Param("id", ParseUUIDPipe) id: string) { await this.files.cleanupWithdrawn(id); return { data: { checked: true } }; }
  @Get(":id") async read(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.files.readForReview(id);
    res.set({ "Content-Type": file.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }); res.send(file.buffer);
  }
}
