import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export const PARTNER_ONBOARDING_STAGES = [
  "START",
  "ACCOUNT_TYPE",
  "BUSINESS",
  "OPERATIONS",
  "DOCUMENTS",
  "REVIEW",
  "SUBMITTED"
] as const;

export type PartnerOnboardingStage = typeof PARTNER_ONBOARDING_STAGES[number];

export class PartnerOnboardingDraftDto {
  @IsOptional()
  @IsIn(PARTNER_ONBOARDING_STAGES)
  onboardingStage?: PartnerOnboardingStage;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountType?: string;

  @IsOptional()
  @IsObject()
  draftData?: Record<string, unknown>;
}
