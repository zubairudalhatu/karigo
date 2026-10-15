import {
  AccountDeletionAccountType,
  AccountDeletionBlockedReasonCode,
  AccountDeletionStatus
} from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

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
  @IsOptional()
  @IsBoolean()
  noIdentifiableLegalHoldConfirmed?: boolean;
  @IsOptional()
  @IsIn(["DELETE_CUSTOMER_DATA"])
  confirmCustomerErasure?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,119}$/)
  retentionApproval?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,119}$/)
  externalCleanupEvidence?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/i)
  reconciledNoticeProviderId?: string;
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
