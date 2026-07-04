import type { ProductCategory, ProductSummary } from "@karigo/shared-types";
import { api } from "./client";

export const productsApi = {
  list: (vendorId: string, productCategory?: ProductCategory) =>
    api.get<ProductSummary[]>(`vendors/${vendorId}/products${productCategory ? `?category=${productCategory}` : ""}`, { authenticated: false }),
  catalogue: (params?: { productCategory?: ProductCategory; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.productCategory) query.set("category", params.productCategory);
    if (params?.search) query.set("search", params.search);
    return api.get<ProductSummary[]>(`products${query.size ? `?${query.toString()}` : ""}`, { authenticated: false });
  }
};
