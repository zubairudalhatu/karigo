import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateRiderProfileDto {
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicleType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guarantorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  guarantorPhone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  preferredServiceAreas?: string[];
}
