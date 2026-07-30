import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TaxiPlaceAutocompleteQueryDto {
  @IsString()
  @MaxLength(120)
  input!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionToken?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceArea?: string;

  @IsOptional()
  @IsIn(["pickup", "destination", "stop"])
  fieldType?: "pickup" | "destination" | "stop";
}
