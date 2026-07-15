import { ServiceProviderType, VendorServiceStatus } from "@prisma/client";
import { PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator";

export class VendorServiceInputDto {
  @IsEnum(ServiceProviderType)
  serviceType!: ServiceProviderType;

  @IsString()
  @MinLength(2)
  @MaxLength(140)
  @Transform(({ value }) => String(value).trim())
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  priceNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  durationEstimate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : undefined)
  serviceAreas?: string[];

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @IsEnum(VendorServiceStatus)
  status?: VendorServiceStatus;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  readinessOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  internalNote?: string;
}

export class UpdateVendorServiceDto extends PartialType(VendorServiceInputDto) {}
