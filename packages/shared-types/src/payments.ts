export interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod?: string;
}

export interface PaymentAuthorization {
  paymentId: string;
  transactionReference: string;
  authorizationUrl?: string;
  provider: string;
}
