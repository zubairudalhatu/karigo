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
  providerSafeNote?: string | null;
  providerMode?: string | null;
  paymentMethod?: string | null;
  walletDebitReference?: string | null;
  walletDebitStatus?: string | null;
  walletReversalReference?: string | null;
  walletReversalStatus?: string | null;
  metadata?: unknown;
  customer: { id: string; fullName: string; phoneNumber?: string | null; email?: string | null };
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface AdminUtilityReadinessCheck {
  connectivity: {
    provider: "accelerate";
    configuration: "READY" | "MISSING_CONFIGURATION";
    environment: "LIVE" | "SANDBOX";
    ipAllowlist: "VERIFIED" | "NOT_VERIFIED" | "VERIFICATION_REQUIRED";
    authentication: "READY" | "FAILED" | "NOT_RUN";
    services: Record<UtilityServiceType, "REACHABLE" | "FAILED" | "NOT_RUN">;
    checkedAt: string;
    safeNote: string;
  };
  catalogue: Record<UtilityServiceType, { status: "READY" | "BLOCKED"; reason: string }>;
  gates: {
    providerConfigured: "READY" | "BLOCKED";
    accelerateAuth: "READY" | "BLOCKED";
    providerIpAccess: "READY" | "BLOCKED";
    walletPayment: "READY" | "NOT_ENABLED";
    liveFulfilment: "READY" | "NOT_ENABLED";
    customerPurchases: "READY" | "NOT_ENABLED";
  };
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
  verifyProviderStatus: (id: string) => api.post<AdminUtilityTransaction>(`admin/utilities/transactions/${id}/verify`),
  updateStatus: (id: string, status: UtilityTransactionStatus, note?: string) =>
    api.patch<AdminUtilityTransaction>(`admin/utilities/transactions/${id}/status`, { status, note }),
  readinessCheck: () => api.post<AdminUtilityReadinessCheck>("admin/utilities/readiness/check")
};
