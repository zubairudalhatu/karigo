import { VendorBranchStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class UpsertVendorBranchDto {
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  name!: string;

  @IsString()
  @MaxLength(300)
  @Transform(trim)
  address!: string;

  @IsString()
  @MaxLength(80)
  @Transform(trim)
  city!: string;

  @IsString()
  @MaxLength(80)
  @Transform(trim)
  state!: string;

  @IsOptional()
  @IsString()
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
