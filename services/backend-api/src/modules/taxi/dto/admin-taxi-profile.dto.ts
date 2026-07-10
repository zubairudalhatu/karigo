import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiDriverProfileStatus } from "@prisma/client";

export class UpdateTaxiDriverProfileStatusDto {
  @IsEnum(TaxiDriverProfileStatus)
  status!: TaxiDriverProfileStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
