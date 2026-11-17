import { VendorBranchStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { PartialType } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class UpsertVendorBranchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  @Transform(trim)
  address!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(trim)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(trim)
  state!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(VendorBranchStatus)
  status?: VendorBranchStatus;
}

export class UpdateVendorBranchDto extends PartialType(UpsertVendorBranchDto) {}
