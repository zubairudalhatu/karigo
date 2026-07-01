import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum RiderJobRejectionReason {
  TOO_FAR = "TOO_FAR",
  VEHICLE_ISSUE = "VEHICLE_ISSUE",
  EMERGENCY = "EMERGENCY",
  UNABLE_TO_CONTACT = "UNABLE_TO_CONTACT",
  OTHER = "OTHER"
}

export class RejectRiderJobDto {
  @IsEnum(RiderJobRejectionReason)
  reason!: RiderJobRejectionReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
