import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";

export class ListUtilityTransactionsQueryDto {
  @IsOptional()
  @IsEnum(UtilityServiceType)
  serviceType?: UtilityServiceType;

  @IsOptional()
  @IsEnum(UtilityTransactionStatus)
  status?: UtilityTransactionStatus;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
