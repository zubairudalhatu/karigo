import type { VendorSummary } from "@karigo/shared-types";
import { api } from "./client";

export const vendorsApi = {
  list: (search?: string) => api.get<VendorSummary[]>(`vendors${search ? `?search=${encodeURIComponent(search)}` : ""}`, { authenticated: false }),
  detail: (id: string) => api.get<VendorSummary>(`vendors/${id}`, { authenticated: false })
};
