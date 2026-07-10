import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TaxiFareEstimateDto {
  @IsString()
  @MaxLength(240)
  pickupAddress!: string;

  @IsString()
  @MaxLength(240)
  destinationAddress!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLatitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLongitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(200)
  estimatedDistanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(600)
  estimatedDurationMin?: number;
}
