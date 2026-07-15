import { DocumentVerificationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewVendorOnboardingDocumentDto {
  @IsEnum(DocumentVerificationStatus)
  status!: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
