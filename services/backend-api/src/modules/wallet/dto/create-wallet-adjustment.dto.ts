import { WalletLedgerDirection } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateWalletAdjustmentDto {
  @IsEnum(WalletLedgerDirection)
  direction!: WalletLedgerDirection;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000000)
  amount!: number;

  @IsString()
  @MaxLength(500)
  @Transform(trim)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  internalNote?: string;
}
