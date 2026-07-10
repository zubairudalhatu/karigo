import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiApplicationStatus } from "@prisma/client";

export class ReviewTaxiDriverApplicationDto {
  @IsEnum(TaxiApplicationStatus)
  status!: TaxiApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  applicantVisibleNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
