import { AdCampaignStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class TransitionAdCampaignDto {
  @IsEnum(AdCampaignStatus)
  status!: AdCampaignStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
