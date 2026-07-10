import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiApplicationStatus, TaxiWaitlistStatus } from "@prisma/client";

export class ListTaxiDriverApplicationsQueryDto {
  @IsOptional()
  @IsEnum(TaxiApplicationStatus)
  status?: TaxiApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListTaxiWaitlistQueryDto {
  @IsOptional()
  @IsEnum(TaxiWaitlistStatus)
  status?: TaxiWaitlistStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
