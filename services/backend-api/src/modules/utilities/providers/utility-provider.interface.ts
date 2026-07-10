import { UtilityServiceType, UtilityTransactionStatus } from "@prisma/client";

export interface UtilityRecipientValidationResult {
  isValid: boolean;
  normalizedRecipient?: string;
  recipientName?: string;
  message?: string;
}

export interface UtilityQuoteInput {
  serviceType: UtilityServiceType;
  providerCode: string;
  productCode?: string;
  amountKobo: number;
  recipient: string;
  recipientName?: string;
}

export interface UtilityQuoteResult {
  providerStatus: string;
  customerNote: string;
  metadata?: Record<string, unknown>;
}

export interface UtilityPurchaseInput extends UtilityQuoteInput {
  reference: string;
  totalKobo: number;
}

export interface UtilityPurchaseResult {
  status: UtilityTransactionStatus;
  providerStatus: string;
  providerReference?: string;
  mockToken?: string;
  customerNote?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface UtilityProviderClient {
  validateRecipient(serviceType: UtilityServiceType, recipient: string): Promise<UtilityRecipientValidationResult>;
  quote(input: UtilityQuoteInput): Promise<UtilityQuoteResult>;
  purchase(input: UtilityPurchaseInput): Promise<UtilityPurchaseResult>;
  checkStatus(reference: string): Promise<UtilityPurchaseResult>;
}
