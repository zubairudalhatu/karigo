import { api } from "./client";

export type PayoutAccountStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "NEEDS_UPDATE";

export interface VendorPayoutAccount {
  id: string;
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

export interface PayoutAccountPayload {
  accountName: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  confirmAccountNumber: string;
}

export const payoutAccountApi = {
  get: () => api.get<VendorPayoutAccount | null>("vendor/payout-account"),
  create: (payload: PayoutAccountPayload) => api.post<VendorPayoutAccount>("vendor/payout-account", payload),
  update: (payload: PayoutAccountPayload) => api.patch<VendorPayoutAccount>("vendor/payout-account", payload)
};
