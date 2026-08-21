import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export const rideLocationOverrideReasons = [
  "CUSTOMER_REQUEST",
  "ROAD_ACCESS",
  "DESTINATION_INACCESSIBLE",
  "SAFETY",
  "GPS_ACCURACY",
  "EMERGENCY",
  "OTHER"
] as const;

export class RideLocationEvidenceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5000)
  accuracyMeters?: number;

  @IsISO8601()
  recordedAt!: string;

  @IsOptional()
  @IsBoolean()
  overrideConfirmed?: boolean;

  @IsOptional()
  @IsIn(rideLocationOverrideReasons)
  overrideReason?: (typeof rideLocationOverrideReasons)[number];

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(240)
  overrideNote?: string;
}
