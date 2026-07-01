import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { normalizePhoneNumber, NIGERIAN_PHONE_PATTERN } from "../../../common/utils/phone.util";

export class RegisterCustomerDto {
  @ApiProperty({ example: "Amina Yusuf" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => String(value).trim())
  fullName!: string;

  @ApiProperty({ example: "+2348012345678" })
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @Transform(({ value }) => normalizePhoneNumber(String(value)))
  phoneNumber!: string;

  @ApiPropertyOptional({ example: "amina@example.com" })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  email?: string;

  @ApiProperty({ example: "KariGO-Test-123!", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[a-z]/, { message: "password must include a lowercase letter" })
  @Matches(/[A-Z]/, { message: "password must include an uppercase letter" })
  @Matches(/\d/, { message: "password must include a number" })
  password!: string;
}
