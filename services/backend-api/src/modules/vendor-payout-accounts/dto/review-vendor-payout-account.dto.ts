import { PayoutAccountStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class ReviewVendorPayoutAccountDto {
  @IsEnum(PayoutAccountStatus)
  status!: PayoutAccountStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  vendorVisibleNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  internalNote?: string;
}
