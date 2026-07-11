import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ApproveCreateServiceProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  reviewNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  providerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  verificationNote?: string;
}
