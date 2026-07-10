import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Max, Min } from "class-validator";

export class TaxiDriverAvailabilityDto {
  @IsBoolean()
  isAvailableForTaxi!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
