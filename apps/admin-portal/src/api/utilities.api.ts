import type { AdminUtilitySummary, UtilityServiceType, UtilityTransactionStatus } from "@karigo/shared-types";
import { api } from "./client";

export interface AdminUtilityTransaction {
  id: string;
  reference: string;
  serviceType: UtilityServiceType;
  provider: { id: string; name: string; code: string; type: UtilityServiceType };
  product?: { id: string; name: string; code: string; amountKobo?: number | null } | null;
  amountKobo: number;
  convenienceFeeKobo: number;
  totalKobo: number;
  recipient: string;
  recipientName?: string | null;
  status: UtilityTransactionStatus;
  providerStatus?: string | null;
  providerReference?: string | null;
  mockToken?: string | null;
  customerNote?: string | null;
  failureReason?: string | null;
  metadata?: unknown;
  customer: { id: string; fullName: string; phoneNumber?: string | null; email?: string | null };
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const utilitiesApi = {
  summary: () => api.get<AdminUtilitySummary>("admin/utilities/summary"),
  list: (filters: { serviceType?: string; status?: string; search?: string }) =>
    api.get<AdminUtilityTransaction[]>(`admin/utilities/transactions${query(filters)}`),
  detail: (id: string) => api.get<AdminUtilityTransaction>(`admin/utilities/transactions/${id}`),
  updateStatus: (id: string, status: UtilityTransactionStatus, note?: string) =>
    api.patch<AdminUtilityTransaction>(`admin/utilities/transactions/${id}/status`, { status, note })
};
