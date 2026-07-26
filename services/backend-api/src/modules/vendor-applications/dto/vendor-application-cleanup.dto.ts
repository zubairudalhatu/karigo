import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class VendorApplicationTrashDto {
  @IsString()
  @IsIn(["duplicate", "test account", "created in error", "rejected onboarding", "inactive/closed", "other"])
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VendorApplicationRestoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class VendorApplicationPermanentDeleteDto {
  @IsString()
  @IsIn(["DELETE", "PERMANENTLY DELETE"])
  confirmation!: "DELETE" | "PERMANENTLY DELETE";
}
