import { randomBytes, createHash } from "crypto";
import { Body, Controller, ForbiddenException, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { AdminRole, UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { PartnerOnboardingGuard, PartnerPrincipal } from "../auth/partner-session";
import { AccountDeletionService } from "./account-deletion.service";

class DeleteAccountDto { @IsUUID() expectedUserId!: string; @Matches(/^DELETE$/) confirmation!: string; @Matches(/^[A-Za-z0-9_-]{43}$/) receiptToken!: string; }
class ReceiptDto { @IsString() @MaxLength(100) reference!: string; @Matches(/^[A-Za-z0-9_-]{43}$/) receiptToken!: string; }
class ReviewedErasureDto { @IsBoolean() retentionReviewed!: boolean; @IsBoolean() noIdentifiableHold!: boolean; @Matches(/^[A-Za-z0-9._:/-]{3,120}$/) externalCleanupEvidence!: string; }

@Controller("partner-mobile/account")
export class PartnerDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}
  @Post("prepare-deletion") @UseGuards(PartnerOnboardingGuard)
  prepare() { const receiptToken = randomBytes(32).toString("base64url"); return { data: { receiptToken, reference: `PDR-${createHash("sha256").update(receiptToken).digest("hex").slice(0, 24)}` } }; }
  @Post("permanent-deletion") @UseGuards(PartnerOnboardingGuard)
  async request(@CurrentUser() user: PartnerPrincipal, @Body() body: DeleteAccountDto) {
    if (body.expectedUserId !== user.id) throw new ForbiddenException("Account changed; confirm deletion again while signed in.");
    return { data: await this.deletion.requestPartnerPermanent(user.id, body.confirmation, body.receiptToken) };
  }
  // Read-only capability; contains no identity data and cannot restore access.
  @Post("deletion-receipt") async receipt(@Body() body: ReceiptDto) {
    return { data: await this.deletion.partnerDeletionReceipt(body.reference, body.receiptToken) };
  }
}

@Controller("admin/partner-account-deletion")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN) @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class PartnerDeletionReviewController {
  constructor(private readonly deletion: AccountDeletionService) {}
  @Post(":id/complete") async complete(@CurrentUser() user: PartnerPrincipal, @Param("id", ParseUUIDPipe) id: string, @Body() body: ReviewedErasureDto) {
    return { data: await this.deletion.completePartnerPermanent(user.id, id, body) };
  }
}
