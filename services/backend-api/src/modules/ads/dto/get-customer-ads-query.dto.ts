import { IsOptional, IsString, MaxLength } from "class-validator";

export class GetCustomerAdsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceCategory?: string;
}
