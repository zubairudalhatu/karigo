import { api } from "./client";

export type AccountDeletionStatus = "REQUESTED" | "BLOCKED" | "IN_REVIEW" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export interface AccountDeletionRequest {
  id: string;
  requestReference: string;
  accountType: "CUSTOMER" | "CAPTAIN" | "PARTNER" | "COMPLETE_ACCOUNT";
  accountTypeLabel: string;
  status: AccountDeletionStatus;
  reason?: string | null;
  requestedAt: string;
  blockers: { code: string; message: string; count: number }[];
  canCancel: boolean;
}

export const accountDeletionApi = {
  current: () => api.get<AccountDeletionRequest | null>("account-deletion"),
  requestCaptainDeactivation: (reason?: string) =>
    api.post<AccountDeletionRequest>("account-deletion", {
      accountType: "CAPTAIN",
      reason,
      confirmation: "DELETE"
    }),
  cancel: (reason?: string) => api.post<AccountDeletionRequest>("account-deletion/cancel", { reason })
};
