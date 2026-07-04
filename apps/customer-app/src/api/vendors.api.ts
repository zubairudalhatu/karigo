import type { ServiceCategory, VendorSummary } from "@karigo/shared-types";
import { api } from "./client";

export const vendorsApi = {
  list: (params?: { search?: string; serviceCategory?: ServiceCategory }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.serviceCategory) query.set("serviceCategory", params.serviceCategory);
    return api.get<VendorSummary[]>(`vendors${query.size ? `?${query.toString()}` : ""}`, { authenticated: false });
  },
  detail: (id: string) => api.get<VendorSummary>(`vendors/${id}`, { authenticated: false })
};
