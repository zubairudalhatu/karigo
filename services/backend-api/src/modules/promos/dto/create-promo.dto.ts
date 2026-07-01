import { Type } from "class-transformer";
import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive,
  IsString, IsUUID, MaxLength, Min
} from "class-validator";
import { PromoDiscountType, ServiceCategory } from "@prisma/client";

export class CreatePromoDto {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(150) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsEnum(PromoDiscountType) discountType!: PromoDiscountType;
  @Type(() => Number) @IsNumber() @IsPositive() discountValue!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() maxDiscountAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumOrderAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() usageLimitPerCustomer?: number;
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @IsOptional() @IsEnum(ServiceCategory) serviceCategory?: ServiceCategory;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
