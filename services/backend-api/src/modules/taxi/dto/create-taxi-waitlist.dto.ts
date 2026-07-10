import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTaxiWaitlistDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(32)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsString()
  @MaxLength(80)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pickupArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
