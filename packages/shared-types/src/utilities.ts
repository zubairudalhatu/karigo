export const utilityServiceTypes = ["AIRTIME", "DATA", "ELECTRICITY", "CABLE_TV"] as const;
export type UtilityServiceType = (typeof utilityServiceTypes)[number];

export const utilityTransactionStatuses = ["DRAFT", "PENDING", "PROCESSING", "SUCCESSFUL", "FAILED", "CANCELLED"] as const;
export type UtilityTransactionStatus = (typeof utilityTransactionStatuses)[number];

export interface UtilityProviderSummary {
  id: string;
  type: UtilityServiceType;
  name: string;
  code: string;
}

export interface UtilityProductSummary {
  id: string;
  providerId: string;
  type: UtilityServiceType;
  name: string;
  code: string;
  amountKobo?: number | null;
  minAmountKobo?: number | null;
  maxAmountKobo?: number | null;
  provider?: UtilityProviderSummary;
}

export interface UtilityQuoteRequest {
  serviceType: UtilityServiceType;
  providerId: string;
  productId?: string;
  amountKobo?: number;
  recipient: string;
  recipientName?: string;
}

export interface CreateUtilityTransactionRequest extends UtilityQuoteRequest {
  customerNote?: string;
  idempotencyKey?: string;
}

export interface UtilityQuoteResult {
  quoteReference: string;
  serviceType: UtilityServiceType;
  provider: UtilityProviderSummary;
  product?: UtilityProductSummary | null;
  amountKobo: number;
  convenienceFeeKobo: number;
  totalKobo: number;
  recipient: string;
  recipientName?: string | null;
  providerStatus: string;
  customerNote: string;
  providerMode?: string;
  testMode: boolean;
  createdAt: string;
}

export interface UtilityTransactionSummary {
  id: string;
  reference: string;
  serviceType: UtilityServiceType;
  provider: UtilityProviderSummary;
  product?: UtilityProductSummary | null;
  amountKobo: number;
  convenienceFeeKobo: number;
  totalKobo: number;
  recipient: string;
  recipientName?: string | null;
  status: UtilityTransactionStatus;
  providerStatus?: string | null;
  mockToken?: string | null;
  customerNote?: string | null;
  failureReason?: string | null;
  providerMode?: string;
  paymentMethod?: string;
  walletDebitReference?: string;
  walletDebitStatus?: string;
  walletReversalReference?: string;
  walletReversalStatus?: string;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface AdminUtilitySummary {
  totalTransactions: number;
  pending: number;
  successful: number;
  failed: number;
  totalValueKobo?: number;
  totalTestValueKobo: number;
}
