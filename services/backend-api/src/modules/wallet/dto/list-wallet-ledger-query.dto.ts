import { WalletLedgerEntryStatus, WalletLedgerEntryType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListWalletLedgerQueryDto {
  @IsOptional()
  @IsEnum(WalletLedgerEntryType)
  entryType?: WalletLedgerEntryType;

  @IsOptional()
  @IsEnum(WalletLedgerEntryStatus)
  status?: WalletLedgerEntryStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
