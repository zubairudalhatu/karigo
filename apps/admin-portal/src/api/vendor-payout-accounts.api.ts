import { api } from "./client";

export type PayoutAccountStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "NEEDS_UPDATE";
export type PayoutAccountFilter = "ALL" | PayoutAccountStatus;

export interface VendorPayoutAccountListItem {
  id: string;
  vendorId: string;
  vendor: {
    id: string;
    businessName: string;
    phoneNumber: string;
    email?: string | null;
    user: { fullName: string; phoneNumber: string; email?: string | null };
  };
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  maskedAccountNumber: string;
  status: PayoutAccountStatus;
  submittedAt: string;
  verifiedAt?: string | null;
  vendorVisibleNote?: string | null;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface VendorPayoutAccountDetail extends VendorPayoutAccountListItem {
  accountNumber: string;
  rejectionReason?: string | null;
  internalNote?: string | null;
  reviewHistory: Array<{
    id: string;
    action: string;
    newValue?: unknown;
    createdAt: string;
    adminUser: { fullName: string; email?: string | null };
  }>;
}

export interface VendorPayoutAccountsResult {
  summary: {
    pendingReview: number;
    verifiedAccounts: number;
    needsUpdate: number;
    rejectedAccounts: number;
  };
  items: VendorPayoutAccountListItem[];
}

export interface ReviewPayoutAccountPayload {
  status: "VERIFIED" | "REJECTED" | "NEEDS_UPDATE";
  vendorVisibleNote?: string;
  internalNote?: string;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const vendorPayoutAccountsApi = {
  list: (filters: { status?: PayoutAccountFilter; search?: string } = {}) =>
    api.get<VendorPayoutAccountsResult>(`admin/vendor-payout-accounts${query({ status: filters.status === "ALL" ? undefined : filters.status, search: filters.search })}`),
  detail: (id: string) => api.get<VendorPayoutAccountDetail>(`admin/vendor-payout-accounts/${id}`),
  review: (id: string, payload: ReviewPayoutAccountPayload) => api.patch<VendorPayoutAccountDetail>(`admin/vendor-payout-accounts/${id}/review`, payload)
};
