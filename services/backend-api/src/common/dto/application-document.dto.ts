import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApplicationDocumentDto {
  @IsString()
  @MaxLength(80)
  documentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  documentName?: string;

  @IsString()
  @MaxLength(1000)
  documentUrl!: string;
}
