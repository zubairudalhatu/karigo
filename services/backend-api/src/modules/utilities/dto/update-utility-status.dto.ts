import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { UtilityTransactionStatus } from "@prisma/client";

export class UpdateUtilityTransactionStatusDto {
  @IsEnum(UtilityTransactionStatus)
  status!: UtilityTransactionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  note?: string;
}
