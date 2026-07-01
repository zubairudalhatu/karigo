import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ServiceCategory } from "@prisma/client";

export class ListVendorsQueryDto {
  @IsOptional()
  @IsEnum(ServiceCategory)
  serviceCategory?: ServiceCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value).trim())
  search?: string;
}

