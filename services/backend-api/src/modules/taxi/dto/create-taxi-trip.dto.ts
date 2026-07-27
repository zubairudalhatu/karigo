import { IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiFareEstimateDto } from "./taxi-fare-estimate.dto";

export class CreateTaxiTripDto extends TaxiFareEstimateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scheduledPickupAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  pickupInstruction?: string;
}
