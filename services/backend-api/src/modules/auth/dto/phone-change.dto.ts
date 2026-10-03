import { IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

export class StartPhoneChangeDto {
  @IsString()
  @MaxLength(24)
  newPhoneNumber!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  currentPassword!: string;
}

export class ConfirmPhoneChangeDto {
  @IsUUID()
  requestId!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;
}
