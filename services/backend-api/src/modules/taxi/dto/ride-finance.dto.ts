import { TaxiRideAdjustmentDirection, TaxiRideFinancialBalanceTarget, TaxiRideFinancialResponsibility, TaxiRideSettlementStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from "class-validator";

export class ListRideFinanceQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  driverProfileId?: string;

  @IsOptional()
  @IsEnum(TaxiRideSettlementStatus)
  status?: TaxiRideSettlementStatus;
}

export class RecordRideCommissionRemittanceDto {
  @IsUUID()
  driverProfileId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountKobo!: number;

  @IsString()
  @Length(3, 120)
  reference!: string;

  @IsString()
  @Length(2, 60)
  method!: string;

  @IsString()
  @Length(5, 500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  remittedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateRideRefundDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountKobo!: number;

  @IsString()
  @Length(8, 160)
  idempotencyKey!: string;

  @IsString()
  @Length(5, 500)
  reason!: string;

  @IsOptional()
  @IsEnum(TaxiRideFinancialResponsibility)
  responsibility?: TaxiRideFinancialResponsibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  platformResponsibilityKobo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  captainResponsibilityKobo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SettleCashRideRefundDto {
  @IsString()
  @Length(3, 120)
  reference!: string;

  @IsString()
  @Length(2, 60)
  method!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AllocateRideRefundResponsibilityDto {
  @IsEnum(TaxiRideFinancialResponsibility)
  responsibility!: TaxiRideFinancialResponsibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  platformResponsibilityKobo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  captainResponsibilityKobo?: number;

  @IsString()
  @Length(5, 500)
  resolutionNote!: string;
}

export class CreateRideFinancialAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountKobo!: number;

  @IsEnum(TaxiRideAdjustmentDirection)
  direction!: TaxiRideAdjustmentDirection;

  @IsEnum(TaxiRideFinancialBalanceTarget)
  target!: TaxiRideFinancialBalanceTarget;

  @IsEnum(TaxiRideFinancialResponsibility)
  responsibility!: TaxiRideFinancialResponsibility;

  @IsString()
  @Length(8, 160)
  idempotencyKey!: string;

  @IsString()
  @Length(5, 500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class OpenRideFinancialDisputeDto {
  @IsString()
  @Length(5, 500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ResolveRideFinancialDisputeDto {
  @IsString()
  @Length(5, 500)
  resolutionNote!: string;
}
