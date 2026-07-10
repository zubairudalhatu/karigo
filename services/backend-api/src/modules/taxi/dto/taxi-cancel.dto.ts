import { IsOptional, IsString, MaxLength } from "class-validator";

export class TaxiCancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
