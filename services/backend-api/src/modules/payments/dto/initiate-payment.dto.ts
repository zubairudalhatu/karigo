import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CUSTOMER_TEST_PAYMENT_PROVIDERS, CustomerTestPaymentProviderName } from "../providers/payment-provider.registry";

export class InitiatePaymentDto {
  @IsOptional()
  @Matches(/^[A-Za-z0-9:._-]{12,128}$/)
  idempotencyKey?: string;
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

  @ApiPropertyOptional({
    enum: CUSTOMER_TEST_PAYMENT_PROVIDERS,
    description: "Optional customer-selected provider. Live checkout is restricted by backend environment guardrails."
  })
  @IsOptional()
  @IsIn(CUSTOMER_TEST_PAYMENT_PROVIDERS)
  paymentProvider?: CustomerTestPaymentProviderName;
}
