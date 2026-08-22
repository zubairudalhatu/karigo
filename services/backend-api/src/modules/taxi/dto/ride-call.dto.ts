import { IsOptional, IsString, MaxLength } from "class-validator";

export class EndRideCallDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reason?: string;
}
