import { api } from "./client";
export interface EarningRecord { id: string; riderPayout: string | number; payoutStatus: string; createdAt: string; order: { orderNumber: string; completedAt?: string | null }; }
export interface EarningsSummary { totalEarnings: string | number; pendingEarnings: string | number; paidEarnings: string | number; completedJobs: EarningRecord[]; }
export const earningsApi = { summary: () => api.get<EarningsSummary>("rider/earnings") };
