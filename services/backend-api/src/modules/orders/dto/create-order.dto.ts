import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { ServiceCategory } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateOrderItemDto } from "./create-order-item.dto";

export class CreateOrderDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deliveryAddressId!: string;

  @ApiProperty({ enum: ServiceCategory, example: ServiceCategory.FOOD })
  @IsEnum(ServiceCategory)
  serviceCategory!: ServiceCategory;

  @ApiProperty({ type: () => [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: "Please call on arrival." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;

  @ApiPropertyOptional({ example: "KARIGOFIRST" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;
}
