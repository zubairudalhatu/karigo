import { VendorStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateVendorStatusDto {
  @IsEnum(VendorStatus)
  status!: VendorStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
