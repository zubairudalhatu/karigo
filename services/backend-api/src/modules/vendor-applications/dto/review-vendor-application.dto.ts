import { VendorApplicationStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewVendorApplicationDto {
  @IsEnum(VendorApplicationStatus)
  status!: VendorApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  notes?: string;

  @IsOptional()
  checklist?: Record<string, unknown>;
}
