import { ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateServiceProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  businessName?: string;

  @IsEnum(ServiceProviderType)
  serviceType!: ServiceProviderType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(140)
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
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicBio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImageUrl?: string;

  @IsOptional()
  @IsEnum(ServiceProviderStatus)
  status?: ServiceProviderStatus;

  @IsOptional()
  @IsBoolean()
  readinessOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  verificationNote?: string;
}
