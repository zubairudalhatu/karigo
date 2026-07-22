import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { UtilityServiceType } from "@prisma/client";

export class UtilityQuoteDto {
  @IsEnum(UtilityServiceType)
  serviceType!: UtilityServiceType;

  @IsUUID()
  providerId!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000000)
  amountKobo?: number;

  @IsString()
  @MaxLength(80)
  recipient!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsIn(["PREPAID", "POSTPAID"])
  meterType?: "PREPAID" | "POSTPAID";
}

export class CreateUtilityTransactionDto extends UtilityQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  customerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  idempotencyKey?: string;
}
