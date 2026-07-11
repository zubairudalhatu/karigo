import { ServiceProviderStatus, ServiceProviderType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ListServiceProvidersQueryDto {
  @IsOptional()
  @IsEnum(ServiceProviderStatus)
  status?: ServiceProviderStatus;

  @IsOptional()
  @IsEnum(ServiceProviderType)
  serviceType?: ServiceProviderType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
