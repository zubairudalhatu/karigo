export const customerTestPaymentProviders = ["mock", "paystack", "monnify", "squad"] as const;
export type CustomerTestPaymentProvider = (typeof customerTestPaymentProviders)[number];

export interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  paymentProvider?: CustomerTestPaymentProvider;
}

export interface PaymentAuthorization {
  paymentId: string;
  transactionReference: string;
  authorizationUrl?: string;
  provider: string;
}
