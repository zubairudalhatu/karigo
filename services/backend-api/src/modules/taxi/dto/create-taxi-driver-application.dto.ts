import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { TaxiVehicleOwnership, TaxiVehicleType } from "@prisma/client";

export class CreateTaxiDriverApplicationDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(32)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsString()
  @MaxLength(80)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  driverLicenceNumber?: string;

  @IsOptional()
  @IsDateString()
  driverLicenceExpiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicleModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  vehicleYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleColour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vehiclePlateNumber?: string;

  @IsOptional()
  @IsEnum(TaxiVehicleType)
  vehicleType?: TaxiVehicleType;

  @IsOptional()
  @IsEnum(TaxiVehicleOwnership)
  vehicleOwnership?: TaxiVehicleOwnership;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  notes?: string;
}
