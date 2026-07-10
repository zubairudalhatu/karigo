import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiWaitlistStatus } from "@prisma/client";

export class UpdateTaxiWaitlistStatusDto {
  @IsEnum(TaxiWaitlistStatus)
  status!: TaxiWaitlistStatus;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  note?: string;
}
