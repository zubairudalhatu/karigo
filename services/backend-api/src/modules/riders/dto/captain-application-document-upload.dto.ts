import { CaptainApplicationDocumentType } from "@prisma/client";
import { IsEnum } from "class-validator";

export class CaptainApplicationDocumentUploadDto {
  @IsEnum(CaptainApplicationDocumentType)
  documentType!: CaptainApplicationDocumentType;
}
