export const PAYMENT_PROVIDERS = ["mock", "paystack", "flutterwave", "monnify", "squad"] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export interface InitializePaymentInput {
  transactionReference: string;
  amount: string;
  currency: string;
  customerEmail?: string | null;
  customerPhone: string;
  redirectUrl?: string | null;
  metadata: Record<string, unknown>;
}

export interface InitializePaymentResult {
  transactionReference: string;
  authorizationUrl: string | null;
  accessCode: string | null;
  providerResponse: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  transactionReference: string;
  successful: boolean;
  amountMinor?: number;
  currency?: string;
  normalizedStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  providerTransactionReference?: string;
  merchantAccountId?: string;
  refundConfirmed?: boolean;
  providerResponse: Record<string, unknown>;
}

export interface WebhookPaymentResult {
  eventType: string;
  transactionReference: string | null;
  successful: boolean;
  verified: boolean;
  amountMinor?: number;
  currency?: string;
  providerEventId?: string;
  providerTransactionReference?: string;
  merchantAccountId?: string;
  providerResponse: Record<string, unknown>;
}

export interface PaymentWebhookContext {
  rawBody?: Buffer;
  signature?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verify(transactionReference: string): Promise<VerifyPaymentResult>;
  parseWebhook(payload: Record<string, unknown>, context?: PaymentWebhookContext): Promise<WebhookPaymentResult>;
  readonly capabilities?: { refunds: boolean; refundLookup: boolean; reconciliation: "REFERENCE" };
  identity?(): { environment: "sandbox" | "live"; merchantAccountId: string };
  refund?(input: ProviderRefundInput): Promise<ProviderRefundResult>;
  lookupRefund?(reference: string): Promise<ProviderRefundResult>;
}

export interface ProviderRefundInput {
  transactionReference: string;
  providerTransactionReference: string;
  amountMinor: number;
  originalAmountMinor: number;
  reason: string;
}
export interface ProviderRefundResult {
  state: "ACCEPTED" | "PENDING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
  providerReference?: string;
  providerStatus?: string;
}
