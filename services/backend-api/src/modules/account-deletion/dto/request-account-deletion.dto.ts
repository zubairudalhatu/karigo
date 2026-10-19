import { AccountDeletionAccountType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class RequestAccountDeletionDto {
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;

  @IsEnum(AccountDeletionAccountType)
  accountType!: AccountDeletionAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  reason?: string;

  @IsString()
  @IsIn(["DELETE"])
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() : value)
  confirmation!: "DELETE";

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  receiptToken?: string;
}

export class CancelAccountDeletionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Transform(trim)
  reason?: string;
}
