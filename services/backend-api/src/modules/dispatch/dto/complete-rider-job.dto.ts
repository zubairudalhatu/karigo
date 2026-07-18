import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CompleteRiderJobDto {
  @IsString()
  @Length(6, 6)
  deliveryOtp!: string;

  @IsOptional()
  @IsBoolean()
  cashCollected?: boolean;
}
