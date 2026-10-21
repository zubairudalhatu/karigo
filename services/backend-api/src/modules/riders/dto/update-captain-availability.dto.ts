import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";

export class CaptainTraceContextDto {
  @IsUUID() captainUserId!: string;
  @IsUUID() workId!: string;
  @IsIn(["RIDE", "DELIVERY"]) mode!: "RIDE" | "DELIVERY";
  @Matches(/^[a-z0-9]{8,20}_[a-z0-9]{8,20}$/) epoch!: string;
  @IsISO8601() startedAt!: string;
}

export class CaptainRideTracePointDto {
  @IsString()
  @MaxLength(100)
  clientPointId!: string;

  @IsNumber() @Min(-90) @Max(90)
  latitude!: number;

  @IsNumber() @Min(-180) @Max(180)
  longitude!: number;

  @IsOptional() @IsNumber() @Min(0) @Max(5000)
  accuracyMeters?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(150)
  speedMetersPerSecond?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(360)
  headingDegrees?: number;

  @IsISO8601()
  recordedAt!: string;

  @IsOptional() @IsIn(["FOREGROUND", "BACKGROUND", "OFFLINE_BUFFER"])
  source?: "FOREGROUND" | "BACKGROUND" | "OFFLINE_BUFFER";
}

export class UpdateCaptainAvailabilityDto {
  @IsOptional() @ValidateNested() @Type(() => CaptainTraceContextDto)
  traceContext?: CaptainTraceContextDto;
  @IsOptional()
  @IsBoolean()
  deliveryOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  rideOnline?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaptainRideTracePointDto)
  tracePoints?: CaptainRideTracePointDto[];
}
