import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { OrderStatus, PaymentStatus, ServiceCategory } from "@prisma/client";

export class ListAdminOrdersQueryDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsUUID() riderId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsEnum(ServiceCategory) serviceCategory?: ServiceCategory;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(({ value }) => String(value).trim()) search?: string;
}
