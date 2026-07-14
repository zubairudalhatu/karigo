import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => String(value).trim())
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : undefined))
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  @Matches(/^(https:\/\/|data:image\/(png|jpe?g|webp);base64,)/, {
    message: "Profile photo must be a secure image URL or supported uploaded image data."
  })
  @Transform(({ value }) => (value ? String(value).trim() : null))
  profilePhotoUrl?: string | null;
}
