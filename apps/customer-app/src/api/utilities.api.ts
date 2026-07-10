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

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const utilitiesApi = {
  providers: (type?: UtilityServiceType) => api.get<UtilityProviderSummary[]>(`utilities/providers${query({ type })}`, { authenticated: false }),
  products: (filters: { type?: UtilityServiceType; providerId?: string }) =>
    api.get<UtilityProductSummary[]>(`utilities/products${query(filters)}`, { authenticated: false }),
  quote: (body: UtilityQuoteRequest) => api.post<UtilityQuoteResult>("customer/utilities/quote", body),
  create: (body: CreateUtilityTransactionRequest) => api.post<UtilityTransactionSummary>("customer/utilities/transactions", body),
  mine: (status?: UtilityTransactionStatus) => api.get<UtilityTransactionSummary[]>(`customer/utilities/transactions${query({ status })}`),
  detail: (id: string) => api.get<UtilityTransactionSummary>(`customer/utilities/transactions/${id}`),
  cancel: (id: string) => api.post<UtilityTransactionSummary>(`customer/utilities/transactions/${id}/cancel`)
};
