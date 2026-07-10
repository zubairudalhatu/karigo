import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { UtilityServiceType } from "@prisma/client";

export class UtilityProvidersQueryDto {
  @IsOptional()
  @IsEnum(UtilityServiceType)
  type?: UtilityServiceType;
}

export class UtilityProductsQueryDto {
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsEnum(UtilityServiceType)
  type?: UtilityServiceType;
}
