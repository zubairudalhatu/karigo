import type { InitiatePaymentRequest } from "@karigo/shared-types";
import { api } from "./client";

export interface PaymentInitiation {
  payment: { id: string; transactionReference: string; paymentStatus: string };
  authorization: { transactionReference: string; authorizationUrl?: string; providerResponse?: unknown };
}

export const paymentsApi = {
  initiate: (body: InitiatePaymentRequest) => api.post<PaymentInitiation>("payments/initiate", body),
  verify: (reference: string) => api.get<{ payment: { paymentStatus: string }; alreadyProcessed: boolean }>(`payments/verify/${reference}`)
};
