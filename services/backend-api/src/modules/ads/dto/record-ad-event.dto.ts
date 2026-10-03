import { AdCampaignEventType, AdPlacementSurface } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RecordAdEventDto {
  @IsEnum(AdCampaignEventType)
  eventType!: AdCampaignEventType;

  @IsEnum(AdPlacementSurface)
  placement!: AdPlacementSurface;

  @IsString()
  @MinLength(12)
  @MaxLength(120)
  renderToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceCategory?: string;
}
