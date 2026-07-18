import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { normalizePhoneNumber, NIGERIAN_PHONE_PATTERN } from "../../../common/utils/phone.util";

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: "08012345678" })
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @Transform(({ value }) => normalizePhoneNumber(String(value)))
  phoneNumber!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  otp!: string;

  @ApiProperty({ example: "NewPassword1", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[a-z]/, { message: "newPassword must include a lowercase letter" })
  @Matches(/[A-Z]/, { message: "newPassword must include an uppercase letter" })
  @Matches(/\d/, { message: "newPassword must include a number" })
  newPassword!: string;
}
