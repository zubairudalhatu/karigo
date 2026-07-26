import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class VendorCleanupNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class VendorPermanentDeleteDto {
  @IsString()
  @IsIn(["DELETE", "PERMANENTLY DELETE"])
  confirmation!: "DELETE" | "PERMANENTLY DELETE";
}
