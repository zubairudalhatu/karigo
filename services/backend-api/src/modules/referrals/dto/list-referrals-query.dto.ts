import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CustomerReferralStatus } from "@prisma/client";

export class ListReferralsQueryDto {
  @IsOptional()
  @IsEnum(CustomerReferralStatus)
  status?: CustomerReferralStatus;

  @IsOptional()
  @IsUUID()
  referrerCustomerId?: string;

  @IsOptional()
  @IsUUID()
  referredCustomerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
