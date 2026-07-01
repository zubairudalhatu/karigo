import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => String(value).trim())
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  email?: string;
}

