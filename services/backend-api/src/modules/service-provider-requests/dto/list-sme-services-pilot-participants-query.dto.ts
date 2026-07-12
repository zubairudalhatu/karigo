import { SmeServicesPilotParticipantStatus, SmeServicesPilotParticipantType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ListSmeServicesPilotParticipantsQueryDto {
  @IsOptional()
  @IsEnum(SmeServicesPilotParticipantType)
  participantType?: SmeServicesPilotParticipantType;

  @IsOptional()
  @IsEnum(SmeServicesPilotParticipantStatus)
  status?: SmeServicesPilotParticipantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pilotZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
