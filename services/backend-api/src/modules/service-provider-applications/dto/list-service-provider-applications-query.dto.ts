import { ServiceProviderApplicationStatus, ServiceProviderType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ListServiceProviderApplicationsQueryDto {
  @IsOptional()
  @IsEnum(ServiceProviderApplicationStatus)
  status?: ServiceProviderApplicationStatus;

  @IsOptional()
  @IsEnum(ServiceProviderType)
  serviceType?: ServiceProviderType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  search?: string;
}
