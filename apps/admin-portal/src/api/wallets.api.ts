import { api } from "./client";

export type WalletStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type WalletLedgerEntryType = "TOP_UP" | "REFUND" | "ADMIN_ADJUSTMENT" | "ORDER_PAYMENT" | "SERVICE_PAYMENT" | "REVERSAL" | "REFERRAL_REWARD";
export type WalletLedgerDirection = "CREDIT" | "DEBIT";
export type WalletLedgerEntryStatus = "PENDING" | "POSTED" | "REVERSED" | "CANCELLED" | "FAILED";

export interface AdminWallet {
  id: string;
  customerId: string;
  currency: string;
  availableBalance: string | number;
  ledgerBalance: string | number;
  status: WalletStatus;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    user: {
      id: string;
      fullName: string;
      phoneNumber: string;
      email?: string | null;
    };
  };
}

export interface AdminWalletLedgerEntry {
  id: string;
  walletId: string;
  customerId: string;
  entryType: WalletLedgerEntryType;
  direction: WalletLedgerDirection;
  status: WalletLedgerEntryStatus;
  amount: string | number;
  currency: string;
  balanceBefore: string | number;
  balanceAfter: string | number;
  reference: string;
  sourceType?: string | null;
  sourceId?: string | null;
  description?: string | null;
  metadata?: unknown;
  createdByAdmin?: { id: string; fullName: string; email?: string | null; adminRole?: string | null } | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWalletDetail extends AdminWallet {
  ledgerEntries: AdminWalletLedgerEntry[];
}

export interface AdminWalletsResult {
  summary: {
    totalWallets: number;
    activeWallets: number;
    suspendedWallets: number;
    closedWallets: number;
    totalAvailableBalance: string | number;
  };
  items: AdminWallet[];
}

export interface WalletAdjustmentPayload {
  direction: WalletLedgerDirection;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  internalNote?: string;
}

export interface WalletAdjustmentResult {
  wallet: AdminWallet;
  entry: AdminWalletLedgerEntry;
  duplicate: boolean;
}

export interface AdminWalletTopUp {
  id: string;
  customer: AdminWallet["customer"];
  amount: string | number;
  currency: string;
  reference: string;
  status: string;
  provider: string;
  walletLedgerEntryId?: string | null;
  ledgerStatus?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  safeFailureReason?: string | null;
}

export interface AdminWalletTopUpsResult {
  items: AdminWalletTopUp[];
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const walletsApi = {
  list: (filters: { status?: WalletStatus | "ALL"; search?: string } = {}) =>
    api.get<AdminWalletsResult>(`admin/wallets${query({ status: filters.status === "ALL" ? undefined : filters.status, search: filters.search })}`),
  topUps: () => api.get<AdminWalletTopUpsResult>("admin/wallets/top-ups"),
  detail: (id: string) => api.get<AdminWalletDetail>(`admin/wallets/${id}`),
  adjustment: (id: string, payload: WalletAdjustmentPayload) =>
    api.post<WalletAdjustmentResult>(`admin/wallets/${id}/adjustments`, payload)
};
