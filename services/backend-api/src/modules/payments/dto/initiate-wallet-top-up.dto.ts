import { Type } from "class-transformer";
import { IsNumber, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class InitiateWalletTopUpDto {
  @ApiProperty({ example: 5000, description: "Wallet top-up amount in NGN." })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  amount!: number;
}
