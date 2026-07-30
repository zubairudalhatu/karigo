import { IsOptional, IsString, MaxLength } from "class-validator";

export class TaxiPlaceDetailsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionToken?: string;
}
