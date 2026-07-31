import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
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

  @IsOptional()
  @IsString()
  @MaxLength(24)
  residentialStateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  residentialCityCode?: string;

  @IsOptional()
  @IsArray()
  operatingAreaIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  primaryOperatingAreaId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  driverLicenceNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  driverLicenceDocumentUrl?: string;

  @IsDateString()
  driverLicenceExpiry!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  vehicleMake!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicleCustomMake?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  vehicleModel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vehicleCustomModel?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2100)
  vehicleYear!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  vehicleColour!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleCustomColour?: string;

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
  @MaxLength(1000)
  vehicleParticularsDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  insuranceDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  notes?: string;

  @IsOptional()
  @IsArray()
  documentIds?: string[];
}
