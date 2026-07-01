import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { ServiceCategory } from "@prisma/client";

export class ValidatePromoDto {
  @IsString() @MaxLength(40) promoCode!: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsEnum(ServiceCategory) serviceCategory?: ServiceCategory;
  @Type(() => Number) @IsNumber() @Min(0) subtotal!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deliveryFee?: number;
}
