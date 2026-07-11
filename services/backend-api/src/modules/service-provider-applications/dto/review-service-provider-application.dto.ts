import { ServiceProviderApplicationStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ReviewServiceProviderApplicationDto {
  @IsEnum(ServiceProviderApplicationStatus)
  status!: ServiceProviderApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  reviewNote?: string;
}
