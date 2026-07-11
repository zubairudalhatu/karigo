import { ServiceProviderType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CreateServiceProviderApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(trim)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  @Transform(trim)
  businessName?: string;

  @IsEnum(ServiceProviderType)
  serviceType!: ServiceProviderType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(trim)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(140)
  @Transform(trim)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(trim)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(trim)
  state!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trim)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  experienceSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  toolsOrEquipment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(trim)
  availability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  identificationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  identificationNumber?: string;

  @IsBoolean()
  detailsAccurateAccepted!: boolean;

  @IsBoolean()
  reviewRequiredAccepted!: boolean;

  @IsBoolean()
  noAutoDispatchAccepted!: boolean;
}
