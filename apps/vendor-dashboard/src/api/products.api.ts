import type { ProductCategory, ProductSummary, VendorProductAvailabilityInput, VendorProductInput } from "@karigo/shared-types";
import { api } from "./client";

export const productsApi = {
  publicList: (vendorId: string) => api.get<ProductSummary[]>(`vendors/${vendorId}/products`, { authenticated: false }),
  listMine: (params?: { productCategory?: ProductCategory; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.productCategory) query.set("category", params.productCategory);
    if (params?.search) query.set("search", params.search);
    return api.get<ProductSummary[]>(`vendor/products${query.size ? `?${query.toString()}` : ""}`);
  },
  create: (body: VendorProductInput) => api.post<ProductSummary>("vendor/products", body),
  update: (productId: string, body: Partial<VendorProductInput>) => api.patch<ProductSummary>(`vendor/products/${productId}`, body),
  updateAvailability: (productId: string, body: VendorProductAvailabilityInput) => api.patch<ProductSummary>(`vendor/products/${productId}/availability`, body),
  archive: (productId: string) => api.delete<ProductSummary>(`vendor/products/${productId}`)
};
