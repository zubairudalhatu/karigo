import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ServiceProviderType } from "@prisma/client";

export class CreateServiceProviderRequestDto {
  @IsEnum(ServiceProviderType)
  serviceType!: ServiceProviderType;

  @IsUUID()
  serviceAddressId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  contactPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredTimeWindow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  customerNote?: string;
}
