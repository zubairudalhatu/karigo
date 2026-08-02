import { api } from "./client";

export type AccountDeletionAccountType = "CUSTOMER" | "CAPTAIN" | "PARTNER" | "COMPLETE_ACCOUNT";
export type AccountDeletionStatus = "REQUESTED" | "BLOCKED" | "IN_REVIEW" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export interface AccountDeletionRequest {
  id: string;
  requestReference: string;
  accountType: AccountDeletionAccountType;
  accountTypeLabel: string;
  status: AccountDeletionStatus;
  reason?: string | null;
  requestedAt: string;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  blockedReasonCode?: string | null;
  blockers: { code: string; message: string; count: number }[];
  canCancel: boolean;
}

export const accountDeletionApi = {
  current: () => api.get<AccountDeletionRequest | null>("account-deletion"),
  request: (body: { accountType: AccountDeletionAccountType; reason?: string; confirmation: "DELETE" }) =>
    api.post<AccountDeletionRequest>("account-deletion", body),
  cancel: (reason?: string) => api.post<AccountDeletionRequest>("account-deletion/cancel", { reason })
};
