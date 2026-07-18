import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CashReconciliationDto {
  @ApiProperty({ example: "Cash received by Operations and matched to order total." })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  note!: string;
}
