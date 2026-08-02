import {
  AccountDeletionAccountType,
  AccountDeletionBlockedReasonCode,
  AccountDeletionStatus
} from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ListAccountDeletionRequestsQueryDto {
  @IsOptional()
  @IsEnum(AccountDeletionStatus)
  status?: AccountDeletionStatus;

  @IsOptional()
  @IsEnum(AccountDeletionAccountType)
  accountType?: AccountDeletionAccountType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  search?: string;
}

export class UpdateAccountDeletionRequestDto {
  @IsEnum(AccountDeletionStatus)
  status!: AccountDeletionStatus;

  @IsOptional()
  @IsEnum(AccountDeletionBlockedReasonCode)
  blockedReasonCode?: AccountDeletionBlockedReasonCode;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Transform(trim)
  adminNote?: string;
}
