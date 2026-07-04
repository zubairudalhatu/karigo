import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

export class ProductOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5_000_000)
  priceAdjustmentKobo!: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  displayOrder?: number;
}

export class ProductOptionGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  minSelections?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxSelections?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  displayOrder?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];
}
