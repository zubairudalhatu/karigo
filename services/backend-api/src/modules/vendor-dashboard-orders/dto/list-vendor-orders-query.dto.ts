import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export class ListVendorOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => String(value).trim())
  search?: string;
}
