import { IsOptional, IsString, MaxLength } from "class-validator";

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
}

