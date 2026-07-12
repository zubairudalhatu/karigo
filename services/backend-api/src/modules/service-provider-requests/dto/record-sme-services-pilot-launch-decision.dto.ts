import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { SmeServicesPilotDecisionStatus } from "@prisma/client";

export class RecordSmeServicesPilotLaunchDecisionDto {
  @IsEnum(SmeServicesPilotDecisionStatus)
  decisionStatus!: SmeServicesPilotDecisionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  decisionTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  blockers?: string;
}
