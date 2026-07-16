import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateAdCreditAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountKobo!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;
}
