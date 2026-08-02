import { AccountDeletionAccountType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class RequestAccountDeletionDto {
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
}

export class CancelAccountDeletionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Transform(trim)
  reason?: string;
}
