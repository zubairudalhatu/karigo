import { VendorTeamRole } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsIn, MinLength, IsOptional, IsString, MaxLength } from "class-validator";

export const assignableTeamRoles = ["MANAGER", "ORDER_MANAGER", "CATALOG_MANAGER", "FINANCE", "SUPPORT", "VIEWER"] as const;

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class InviteVendorTeamMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  phoneNumber?: string;

  @IsEnum(VendorTeamRole)
  @IsIn(assignableTeamRoles)
  role!: VendorTeamRole;
}

export class UpdateVendorTeamMemberDto {
  @IsOptional()
  @IsEnum(VendorTeamRole)
  @IsIn(assignableTeamRoles)
  role?: VendorTeamRole;
}
