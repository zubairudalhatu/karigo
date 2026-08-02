import { api } from "./client";
export interface EarningRecord { id: string; riderPayout: string | number; payoutStatus: string; createdAt: string; order: { orderNumber: string; completedAt?: string | null }; }
export interface RideEarningRecord { id: string; tripReference: string; riderPayout: string | number; payoutStatus: string; createdAt: string; trip: { tripReference: string; completedAt?: string | null }; }
export interface EarningsSummary {
  totalEarnings: string | number;
  todayEarnings?: string | number;
  thisWeekEarnings?: string | number;
  pendingEarnings: string | number;
  paidEarnings: string | number;
  completedDeliveriesCount?: number;
  completedRidesCount?: number;
  completedJobs: EarningRecord[];
  completedRides?: RideEarningRecord[];
}
export const earningsApi = { summary: () => api.get<EarningsSummary>("rider/earnings") };
