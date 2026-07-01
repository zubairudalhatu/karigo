import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum VendorOrderRejectionReason {
  ITEM_UNAVAILABLE = "ITEM_UNAVAILABLE",
  VENDOR_CLOSED = "VENDOR_CLOSED",
  PRICE_ERROR = "PRICE_ERROR",
  TOO_BUSY = "TOO_BUSY",
  OUT_OF_DELIVERY_WINDOW = "OUT_OF_DELIVERY_WINDOW",
  OTHER = "OTHER"
}

export class RejectVendorOrderDto {
  @IsEnum(VendorOrderRejectionReason)
  reason!: VendorOrderRejectionReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
