import { PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { AdCampaignStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { CreateAdCampaignDto } from "./create-ad-campaign.dto";

export class UpdateAdCampaignDto extends PartialType(CreateAdCampaignDto) {
  @IsOptional()
  @IsEnum(AdCampaignStatus)
  status?: AdCampaignStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservedCreditKobo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
