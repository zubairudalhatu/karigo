import { IsOptional, IsString, MaxLength } from "class-validator";

export class PreviewSmeServicesPilotInvitationTemplateDto {
  @IsString()
  @MaxLength(80)
  templateKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pilotZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pilotDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serviceFocus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supportContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customNote?: string;
}
