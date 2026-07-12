import { api } from "./client";

export type WalletStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type WalletLedgerEntryType = "TOP_UP" | "REFUND" | "ADMIN_ADJUSTMENT" | "ORDER_PAYMENT" | "SERVICE_PAYMENT" | "REVERSAL" | "REFERRAL_REWARD";
export type WalletLedgerDirection = "CREDIT" | "DEBIT";
export type WalletLedgerEntryStatus = "PENDING" | "POSTED" | "REVERSED" | "CANCELLED" | "FAILED";

export interface CustomerWallet {
  id: string;
  customerId: string;
  currency: string;
  availableBalance: string | number;
  ledgerBalance: string | number;
  status: WalletStatus;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWalletLedgerEntry {
  id: string;
  entryType: WalletLedgerEntryType;
  direction: WalletLedgerDirection;
  status: WalletLedgerEntryStatus;
  amount: string | number;
  currency: string;
  balanceAfter: string | number;
  reference: string;
  sourceType?: string | null;
  description?: string | null;
  postedAt?: string | null;
  createdAt: string;
}

export interface CustomerWalletLedgerResult {
  wallet: CustomerWallet;
  items: CustomerWalletLedgerEntry[];
}

export const walletApi = {
  summary: () => api.get<CustomerWallet>("wallet"),
  transactions: () => api.get<CustomerWalletLedgerResult>("wallet/transactions")
};
