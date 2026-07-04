import { IsEnum, IsOptional } from "class-validator";

export enum VendorSettlementStatusFilter {
  PENDING = "PENDING",
  PAID = "PAID"
}

export class ListVendorSettlementsQueryDto {
  @IsOptional()
  @IsEnum(VendorSettlementStatusFilter)
  status?: VendorSettlementStatusFilter;
}
