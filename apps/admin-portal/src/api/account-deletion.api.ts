import { api } from "./client";

export type AccountDeletionAccountType = "CUSTOMER" | "CAPTAIN" | "PARTNER" | "COMPLETE_ACCOUNT";
export type AccountDeletionStatus = "REQUESTED" | "BLOCKED" | "IN_REVIEW" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type AccountDeletionBlockedReasonCode =
  | "ACTIVE_ORDER_EXISTS"
  | "ACTIVE_DELIVERY_EXISTS"
  | "ACTIVE_RIDE_EXISTS"
  | "OPEN_PARTNER_ORDER_EXISTS"
  | "PENDING_SETTLEMENT_EXISTS"
  | "PENDING_EARNING_EXISTS"
  | "ACCOUNT_SCOPE_INVALID";

export interface AccountDeletionBlocker {
  code: AccountDeletionBlockedReasonCode;
  message: string;
  count: number;
}

export interface AccountDeletionRequest {
  id: string;
  requestReference: string;
  accountType: AccountDeletionAccountType;
  accountTypeLabel: string;
  status: AccountDeletionStatus;
  reason?: string | null;
  requestedAt: string;
  confirmedAt?: string | null;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  blockedReasonCode?: AccountDeletionBlockedReasonCode | null;
  blockers: AccountDeletionBlocker[];
  canCancel: boolean;
  adminNote?: string | null;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
    role: string;
    accountStatus: string;
    hasCustomerProfile: boolean;
    hasCaptainProfile: boolean;
    hasPartnerProfile: boolean;
  };
  operationalIndicators: {
    partnerOnline: boolean;
    captainDeliveryOnline: boolean;
    captainRideOnline: boolean;
    activeWorkMode?: string | null;
  };
}

export const accountDeletionApi = {
  list: (params?: { status?: string; accountType?: string; search?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.accountType) search.set("accountType", params.accountType);
    if (params?.search) search.set("search", params.search);
    const query = search.toString();
    return api.get<AccountDeletionRequest[]>(`admin/account-deletion-requests${query ? `?${query}` : ""}`);
  },
  detail: (id: string) => api.get<AccountDeletionRequest>(`admin/account-deletion-requests/${id}`),
  updateStatus: (id: string, body: { status: AccountDeletionStatus; blockedReasonCode?: AccountDeletionBlockedReasonCode; adminNote?: string }) =>
    api.patch<AccountDeletionRequest>(`admin/account-deletion-requests/${id}/status`, body)
};
