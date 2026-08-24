import { PartnerCommercialModel, VendorApplicationCategory } from "@prisma/client";
import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdatePartnerCommercialPolicyDto {
  @IsEnum(VendorApplicationCategory)
  businessCategory!: VendorApplicationCategory;

  @IsEnum(PartnerCommercialModel)
  commercialModel!: PartnerCommercialModel;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  commissionRateBasisPoints!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  onboardingFeeKobo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalFeeKobo?: number | null;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  publicTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1200)
  publicSummary!: string;

  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  policyVersion!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsBoolean()
  isActive!: boolean;

  @IsBoolean()
  publicOnboardingEnabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  internalNote?: string;
}

export class PartnerFeeWaiverDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  note!: string;
}
