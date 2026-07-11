import { ServiceProviderRequestStatus, ServiceProviderType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ListServiceProviderRequestsQueryDto {
  @IsOptional()
  @IsEnum(ServiceProviderRequestStatus)
  status?: ServiceProviderRequestStatus;

  @IsOptional()
  @IsEnum(ServiceProviderType)
  serviceType?: ServiceProviderType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  search?: string;
}
