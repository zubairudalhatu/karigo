import { IsOptional, IsString, MaxLength } from "class-validator";

export class VendorCleanupNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
