import type { ProductCategory, ServiceCategory } from "./index";

export interface VendorSummary {
  id: string;
  businessName: string;
  businessCategory: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  rating?: number | null;
  averagePreparationTimeMinutes?: number | null;
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
  optionGroups?: ProductOptionGroup[];
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
  optionGroups?: ProductOptionGroupInput[];
}

export interface VendorProductAvailabilityInput {
  isAvailable: boolean;
}

export interface ProductOptionInput {
  name: string;
  priceAdjustmentKobo: number;
  available?: boolean;
  displayOrder?: number;
}

export interface ProductOptionGroupInput {
  name: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
  options?: ProductOptionInput[];
}

export interface ProductOption {
  id: string;
  name: string;
  priceAdjustmentKobo: number;
  available: boolean;
  displayOrder: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  options: ProductOption[];
}
