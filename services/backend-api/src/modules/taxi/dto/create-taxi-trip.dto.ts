import { IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiFareEstimateDto } from "./taxi-fare-estimate.dto";

export class CreateTaxiTripDto extends TaxiFareEstimateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;
}
