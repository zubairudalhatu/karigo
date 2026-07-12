import { Type } from "class-transformer";
import { IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { TaxiVehicleOwnership, TaxiVehicleType } from "@prisma/client";

export class CreateTaxiDriverApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  driverLicenceNumber!: string;

  @IsDateString()
  driverLicenceExpiry!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  vehicleMake!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  vehicleModel!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  vehicleYear!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vehicleColour!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  vehiclePlateNumber!: string;

  @IsEnum(TaxiVehicleType)
  vehicleType!: TaxiVehicleType;

  @IsEnum(TaxiVehicleOwnership)
  vehicleOwnership!: TaxiVehicleOwnership;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  notes?: string;
}
