import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { ReferralRewardTrigger, ReferralRewardType } from "@prisma/client";

export class ListRewardRulesQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === undefined ? undefined : value === true || value === "true")
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ReferralRewardTrigger)
  trigger?: ReferralRewardTrigger;

  @IsOptional()
  @IsEnum(ReferralRewardType)
  rewardType?: ReferralRewardType;
}
