import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class AssignServiceProviderDto {
  @IsUUID()
  providerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  assignmentNote?: string;
}
