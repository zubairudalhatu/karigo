import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ProductCategory } from "@prisma/client";

export class ListProductsQueryDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value).trim())
  search?: string;
}
