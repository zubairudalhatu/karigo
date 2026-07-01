export const PAYMENT_PROVIDERS = ["mock", "paystack", "flutterwave", "monnify", "squad"] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export interface InitializePaymentInput {
  transactionReference: string;
  amount: string;
  currency: string;
  customerEmail?: string | null;
  customerPhone: string;
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
  providerResponse: Record<string, unknown>;
}

export interface WebhookPaymentResult {
  eventType: string;
  transactionReference: string | null;
  successful: boolean;
  verified: boolean;
  amountMinor?: number;
  currency?: string;
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
}
