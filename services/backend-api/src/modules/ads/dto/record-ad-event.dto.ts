import { AdCampaignEventType, AdPlacementSurface } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class RecordAdEventDto {
  @IsEnum(AdCampaignEventType)
  eventType!: AdCampaignEventType;

  @IsEnum(AdPlacementSurface)
  placement!: AdPlacementSurface;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  renderToken?: string;
}
