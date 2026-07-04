import type { ProductCategory, ServiceCategory } from "./index";

export interface VendorSummary {
  id: string;
  businessName: string;
  businessCategory: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isOpen: boolean;
  status: string;
}

export interface ProductSummary {
  id: string;
  vendorId: string;
  vendorName?: string;
  name: string;
  description: string;
  category: string;
  productCategory: ProductCategory;
  serviceCategory?: ServiceCategory;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorProductInput {
  name: string;
  description: string;
  category?: string;
  productCategory: ProductCategory;
  price: number;
  imageUrl: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface VendorProductAvailabilityInput {
  isAvailable: boolean;
}
