import type { InitiatePaymentRequest, PublicPaymentConfig } from "@karigo/shared-types";
import { api } from "./client";

export interface PaymentInitiation {
  attempt?: { id: string; state: string; retry: string };
  payment: { id: string; transactionReference: string; paymentStatus: string; gateway?: string };
  authorization: {
    transactionReference: string;
    reference?: string;
    amount?: number;
    currency?: string;
    authorizationUrl?: string | null;
    checkoutUrl?: string | null;
    paymentUrl?: string | null;
    url?: string | null;
    accessCode?: string | null;
    provider?: string;
  };
}

export const paymentsApi = {
  publicConfig: () => api.get<PublicPaymentConfig>("payments/public-config", { authenticated: false }),
  initiate: (body: InitiatePaymentRequest) => api.post<PaymentInitiation>("payments/initiate", { ...body, idempotencyKey: body.idempotencyKey ?? `order-payment:${body.orderId}` }, { retryOnNetworkFailure: false, retryOnTemporaryFailure: false }),
  verify: (reference: string) => api.get<{ payment: { paymentStatus: string }; attempt?: { id: string; state: string }; alreadyProcessed: boolean }>(`payments/verify/${reference}`),
  verifyWalletTopUp: (reference: string) =>
    api.get<{ payment: { paymentStatus: string }; alreadyProcessed: boolean }>(`payments/wallet-top-ups/verify/${reference}`)
};
