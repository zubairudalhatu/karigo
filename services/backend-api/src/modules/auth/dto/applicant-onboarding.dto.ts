import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../../common/utils/phone.util";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const normalizePhone = ({ value }: { value: unknown }) => typeof value === "string" ? normalizePhoneNumber(value) : value;

export class CreateApplicantAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(trim)
  fullName!: string;

  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(normalizePhone)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  email?: string;
}

export class ApplicantPhoneDto {
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(normalizePhone)
  phoneNumber!: string;
}

export class VerifyApplicantOtpDto extends ApplicantPhoneDto {
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  @Transform(trim)
  otp!: string;
}

export class CreateApplicantPasswordDto extends ApplicantPhoneDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
