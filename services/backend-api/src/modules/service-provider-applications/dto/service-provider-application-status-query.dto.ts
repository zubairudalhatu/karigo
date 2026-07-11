import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ServiceProviderApplicationStatusQueryDto {
  @IsString()
  @MaxLength(40)
  @Transform(trim)
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(trim)
  applicationReference?: string;
}
