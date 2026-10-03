import { IsEnum, IsOptional, IsUUID } from "class-validator";

export enum AdPerformanceRange {
  TODAY = "TODAY",
  DAYS_7 = "DAYS_7",
  DAYS_30 = "DAYS_30",
  LIFETIME = "LIFETIME"
}

export class GetAdPerformanceQueryDto {
  @IsOptional()
  @IsEnum(AdPerformanceRange)
  range: AdPerformanceRange = AdPerformanceRange.DAYS_7;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
