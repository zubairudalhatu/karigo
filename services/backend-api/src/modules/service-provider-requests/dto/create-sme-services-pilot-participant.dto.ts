import { SmeServicesPilotInvitationChannel, SmeServicesPilotParticipantStatus, SmeServicesPilotParticipantType } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateSmeServicesPilotParticipantDto {
  @IsEnum(SmeServicesPilotParticipantType)
  participantType!: SmeServicesPilotParticipantType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  displayName!: string;

  @IsOptional()
  @IsEnum(SmeServicesPilotParticipantStatus)
  status?: SmeServicesPilotParticipantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(140)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pilotZone?: string;

  @IsOptional()
  @IsUUID()
  relatedUserId?: string;

  @IsOptional()
  @IsUUID()
  relatedProviderId?: string;

  @IsOptional()
  @IsEnum(SmeServicesPilotInvitationChannel)
  invitationChannel?: SmeServicesPilotInvitationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  invitationNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @IsOptional()
  @IsBoolean()
  consentConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  safetyBriefingCompleted?: boolean;
}
