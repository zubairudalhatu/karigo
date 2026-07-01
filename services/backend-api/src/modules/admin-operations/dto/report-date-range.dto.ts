import { IsDateString, IsOptional } from "class-validator";

export class ReportDateRangeDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
