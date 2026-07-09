import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class UpsertVendorPayoutAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  accountName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  bankName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(trim)
  bankCode?: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: "Account number must be a 10-digit Nigerian bank account number" })
  @Transform(trim)
  accountNumber!: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: "Confirm account number must match the 10-digit account number format" })
  @Transform(trim)
  confirmAccountNumber!: string;
}
