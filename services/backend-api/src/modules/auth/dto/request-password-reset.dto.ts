import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";
import { normalizePhoneNumber, NIGERIAN_PHONE_PATTERN } from "../../../common/utils/phone.util";

export class RequestPasswordResetDto {
  @ApiProperty({ example: "08012345678" })
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @Transform(({ value }) => normalizePhoneNumber(String(value)))
  phoneNumber!: string;
}
