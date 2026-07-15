import { VendorTeamRole } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class InviteVendorTeamMemberDto {
  @IsString()
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
  role!: VendorTeamRole;
}

export class UpdateVendorTeamMemberDto {
  @IsOptional()
  @IsEnum(VendorTeamRole)
  role?: VendorTeamRole;
}
