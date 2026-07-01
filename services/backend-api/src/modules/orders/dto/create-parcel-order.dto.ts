import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateParcelOrderDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  pickupAddressId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  deliveryAddressId!: string;

  @ApiProperty({ example: "Musa Bello" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @ApiProperty({ example: "+2348099999999" })
  @IsString()
  @MinLength(10)
  @MaxLength(30)
  recipientPhone!: string;

  @ApiProperty({ example: "Sealed document envelope" })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  itemDescription!: string;

  @ApiPropertyOptional({ example: "Handle with care." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;
}
