import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class InitiatePaymentDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 6000, description: "Must match the server-calculated order total." })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: "mock" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;
}
