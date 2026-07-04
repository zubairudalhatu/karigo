import { api } from "./client";

export type VendorSettlementStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
export type VendorSettlementFilter = "ALL" | "PENDING" | "PAID";

export interface VendorSettlementSummary {
  totalSettlements: number;
  pendingPayout: string | number;
  paidOut: string | number;
}

export interface VendorSettlement {
  id: string;
  orderNumber: string;
  orderCompletedAt?: string | null;
  grossOrderSubtotal: string | number;
  deliveryFee?: string | number | null;
  commissionRate: string | number;
  platformFee: string | number;
  settlementAmount: string | number;
  settlementStatus: VendorSettlementStatus;
  paidAt?: string | null;
  payoutReference?: string | null;
  createdAt: string;
}

export interface VendorSettlementsResult {
  summary: VendorSettlementSummary;
  items: VendorSettlement[];
}

export const settlementsApi = {
  list: (status: VendorSettlementFilter = "ALL") =>
    api.get<VendorSettlementsResult>(`vendor/settlements${status === "ALL" ? "" : `?status=${status}`}`)
};
