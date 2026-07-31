import { DocumentVerificationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewCaptainApplicationDocumentDto {
  @IsEnum(DocumentVerificationStatus)
  status!: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(700)
  applicantVisibleNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
