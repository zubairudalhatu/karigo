import type { OrderSummary } from "./orders";

export type RiderAvailability = "ONLINE" | "OFFLINE" | "BUSY";

export interface RiderJob extends OrderSummary {
  deliveryOtp?: never;
  pickupAddress?: unknown;
  deliveryAddress?: unknown;
}

export interface RiderEarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}
