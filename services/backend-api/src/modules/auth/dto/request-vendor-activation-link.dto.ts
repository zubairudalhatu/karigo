import { Transform } from "class-transformer";
import { IsEmail, IsOptional, MaxLength, Matches } from "class-validator";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../../common/utils/phone.util";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const normalizePhone = ({ value }: { value: unknown }) => typeof value === "string" && value.trim()
  ? normalizePhoneNumber(value)
  : value;

export class RequestVendorActivationLinkDto {
  @IsOptional()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(normalizePhone)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  email?: string;
}
