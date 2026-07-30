import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TaxiRoutePreviewDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLatitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLongitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  destinationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceArea?: string;
}
