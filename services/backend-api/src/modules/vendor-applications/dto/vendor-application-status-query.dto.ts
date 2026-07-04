import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class VendorApplicationStatusQueryDto {
  @IsString()
  @MaxLength(40)
  @Transform(trim)
  reference!: string;

  @IsEmail()
  @MaxLength(160)
  @Transform(trim)
  email!: string;
}
