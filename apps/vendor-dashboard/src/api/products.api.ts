import type { ProductSummary } from "@karigo/shared-types";
import { api } from "./client";
export const productsApi = { publicList: (vendorId: string) => api.get<ProductSummary[]>(`vendors/${vendorId}/products`, { authenticated: false }) };
