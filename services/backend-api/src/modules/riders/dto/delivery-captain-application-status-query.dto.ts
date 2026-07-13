import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../../common/utils/phone.util";

export class DeliveryCaptainApplicationStatusQueryDto {
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @MaxLength(32)
  @Transform(({ value }) => typeof value === "string" ? normalizePhoneNumber(value) : value)
  phoneNumber!: string;
}
