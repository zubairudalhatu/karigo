import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CustomerReferralStatus } from "@prisma/client";

export class ReviewReferralDto {
  @IsEnum(CustomerReferralStatus)
  status!: CustomerReferralStatus;

  @IsOptional()
  @IsUUID()
  rewardRuleId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value ? String(value).trim() : undefined)
  adminNote?: string;
}
