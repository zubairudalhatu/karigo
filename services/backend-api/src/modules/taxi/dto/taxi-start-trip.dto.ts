import { IsOptional, IsString, Length } from "class-validator";

export class TaxiStartTripDto {
  @IsOptional()
  @IsString()
  @Length(6, 6)
  tripPin?: string;
}
