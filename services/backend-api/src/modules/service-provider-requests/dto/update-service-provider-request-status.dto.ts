import { ServiceProviderRequestStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class UpdateServiceProviderRequestStatusDto {
  @IsEnum(ServiceProviderRequestStatus)
  status!: ServiceProviderRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  adminNote?: string;
}
