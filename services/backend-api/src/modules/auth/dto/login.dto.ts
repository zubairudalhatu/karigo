import { Transform } from "class-transformer";
import { IsString, MaxLength, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { normalizePhoneNumber, NIGERIAN_PHONE_PATTERN } from "../../../common/utils/phone.util";

export class LoginDto {
  @ApiProperty({ example: "+2348012345678" })
  @IsString()
  @Matches(NIGERIAN_PHONE_PATTERN, { message: "phoneNumber must be a valid Nigerian mobile number" })
  @Transform(({ value }) => normalizePhoneNumber(String(value)))
  phoneNumber!: string;

  @ApiProperty({ example: "KariGO-Test-123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
