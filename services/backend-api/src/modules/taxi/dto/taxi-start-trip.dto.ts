import { IsString, Length } from "class-validator";

export class TaxiStartTripDto {
  @IsString()
  @Length(6, 6)
  tripPin!: string;
}
