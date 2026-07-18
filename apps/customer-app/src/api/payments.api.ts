import type { InitiatePaymentRequest, PublicPaymentConfig } from "@karigo/shared-types";
import { api } from "./client";

export interface PaymentInitiation {
  payment: { id: string; transactionReference: string; paymentStatus: string; gateway?: string };
  authorization: {
    transactionReference: string;
    authorizationUrl?: string | null;
    checkoutUrl?: string | null;
    paymentUrl?: string | null;
    url?: string | null;
    accessCode?: string | null;
    providerResponse?: unknown;
  };
}

export const paymentsApi = {
  publicConfig: () => api.get<PublicPaymentConfig>("payments/public-config", { authenticated: false }),
  initiate: (body: InitiatePaymentRequest) => api.post<PaymentInitiation>("payments/initiate", body),
  verify: (reference: string) => api.get<{ payment: { paymentStatus: string }; alreadyProcessed: boolean }>(`payments/verify/${reference}`),
  verifyWalletTopUp: (reference: string) =>
    api.get<{ payment: { paymentStatus: string }; alreadyProcessed: boolean }>(`payments/wallet-top-ups/verify/${reference}`)
};
