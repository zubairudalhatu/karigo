import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { ProductCategory } from "@prisma/client";
import { ProductOptionGroupDto } from "./product-option.dto";

export class ProductInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => String(value).trim())
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(280)
  @Transform(({ value }) => String(value).trim())
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  category?: string;

  @IsEnum(ProductCategory)
  productCategory!: ProductCategory;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price!: number;

  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(500)
  imageUrl!: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionGroupDto)
  optionGroups?: ProductOptionGroupDto[];
}
