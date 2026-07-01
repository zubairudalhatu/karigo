import { Type } from "class-transformer";
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  label!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNote?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

