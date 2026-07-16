import { Type } from "class-transformer";
import { AdCampaignStatus, AdPlacementSurface, AdSponsorType } from "@prisma/client";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateAdCampaignDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(280)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedBudgetKobo?: number;

  @IsOptional()
  @IsEnum(AdPlacementSurface)
  placementSurface?: AdPlacementSurface;

  @IsOptional()
  @IsEnum(AdSponsorType)
  sponsorType?: AdSponsorType;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  advertiserName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  advertiserContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  advertiserEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  advertiserPhone?: string;

  @IsOptional()
  @IsEnum(AdCampaignStatus)
  status?: AdCampaignStatus;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
