import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "OldPassword1", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ example: "NewPassword1", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[a-z]/, { message: "newPassword must include a lowercase letter" })
  @Matches(/[A-Z]/, { message: "newPassword must include an uppercase letter" })
  @Matches(/\d/, { message: "newPassword must include a number" })
  newPassword!: string;
}
