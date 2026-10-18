import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { TaxiFareEstimateDto } from "./taxi-fare-estimate.dto";

export class CreateTaxiTripDto extends TaxiFareEstimateDto {
  @IsOptional()
  @IsIn(["USER_SUPPLIED", "GOOGLE_DERIVED", "LEGACY_UNKNOWN"])
  pickupContentSource?: "USER_SUPPLIED" | "GOOGLE_DERIVED" | "LEGACY_UNKNOWN";

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pickupContentProof?: string;

  @IsOptional()
  @IsIn(["USER_SUPPLIED", "GOOGLE_DERIVED", "LEGACY_UNKNOWN"])
  destinationContentSource?: "USER_SUPPLIED" | "GOOGLE_DERIVED" | "LEGACY_UNKNOWN";

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  destinationContentProof?: string;

  @IsOptional()
  @IsIn(["USER_SUPPLIED", "GOOGLE_DERIVED", "LEGACY_UNKNOWN"])
  stopContentSource?: "USER_SUPPLIED" | "GOOGLE_DERIVED" | "LEGACY_UNKNOWN";

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  stopContentProof?: string;

  @IsOptional()
  @IsIn(["GOOGLE_DERIVED", "USER_SUPPLIED"])
  routeContentSource?: "GOOGLE_DERIVED" | "USER_SUPPLIED";

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

  @IsOptional()
  @IsString()
  @MaxLength(80)
  clientRequestId?: string;
}
