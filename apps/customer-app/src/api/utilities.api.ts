import type {
  CreateUtilityTransactionRequest,
  UtilityProductSummary,
  UtilityProviderSummary,
  UtilityQuoteRequest,
  UtilityQuoteResult,
  UtilityServiceType,
  UtilityTransactionSummary,
  UtilityTransactionStatus
} from "@karigo/shared-types";
import { api } from "./client";
export type UtilityAvailability = "AVAILABLE" | "PREPARING_LAUNCH" | "TEMPORARILY_UNAVAILABLE";

export interface UtilityReadiness {
  services: Array<{
    serviceType: UtilityServiceType;
    availability: UtilityAvailability;
    note: string;
  }>;
}

export interface GotvAcceptanceProduct { id: string; name: string; amountKobo: number; provider: string; currency: string }
export interface GotvAcceptanceAccount { recipient: string; recipientName: string | null; recipientVerified: true; provider: string; products: GotvAcceptanceProduct[]; readOnly: true; paymentAllowed: false }
export interface GotvAcceptanceQuote extends Omit<GotvAcceptanceAccount, "products"> {
  quoteReference: string; product: GotvAcceptanceProduct; amountKobo: number; convenienceFeeKobo: number; totalKobo: number; walletBeforeKobo: number; projectedWalletAfterKobo: number;
}


const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const utilitiesApi = {
  gotvAcceptanceAccess: () => api.get<{ provider: string; readOnly: true; paymentAllowed: false }>("customer/utilities/acceptance/gotv"),
  gotvAcceptanceValidate: (recipient: string) => api.post<GotvAcceptanceAccount>("customer/utilities/acceptance/gotv/validate", { recipient }),
  gotvAcceptanceQuote: (recipient: string, productId: string) => api.post<GotvAcceptanceQuote>("customer/utilities/acceptance/gotv/quote", { recipient, productId }),
  providers: (type?: UtilityServiceType) => api.get<UtilityProviderSummary[]>(`utilities/providers${query({ type })}`, { authenticated: false }),
  readiness: () => api.get<UtilityReadiness>("utilities/readiness", { authenticated: false }),
  products: (filters: { type?: UtilityServiceType; providerId?: string }) =>
    api.get<UtilityProductSummary[]>(`utilities/products${query(filters)}`, { authenticated: false }),
  quote: (body: UtilityQuoteRequest) => api.post<UtilityQuoteResult>("customer/utilities/quote", body),
  create: (body: CreateUtilityTransactionRequest) => api.post<UtilityTransactionSummary>("customer/utilities/transactions", body),
  mine: (status?: UtilityTransactionStatus) => api.get<UtilityTransactionSummary[]>(`customer/utilities/transactions${query({ status })}`),
  detail: (id: string) => api.get<UtilityTransactionSummary>(`customer/utilities/transactions/${id}`),
  cancel: (id: string) => api.post<UtilityTransactionSummary>(`customer/utilities/transactions/${id}/cancel`)
};
