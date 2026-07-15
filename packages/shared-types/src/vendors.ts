import type { ProductCategory, ServiceCategory, ServiceProviderType, VendorServiceStatus } from "./index";

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

export type VendorUploadPurpose = "onboarding-document" | "product-image" | "service-image" | "logo" | "cover";

export interface VendorUploadResult {
  url: string;
  relativeUrl: string;
  purpose: VendorUploadPurpose;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface VendorServiceSummary {
  id: string;
  vendorId: string;
  serviceType: ServiceProviderType;
  name: string;
  description: string;
  basePrice?: number | null;
  priceNote?: string | null;
  durationEstimate?: string | null;
  serviceAreas: string[];
  imageUrl?: string | null;
  status: VendorServiceStatus;
  isAvailable: boolean;
  readinessOnly: boolean;
  internalNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorServiceInput {
  serviceType: ServiceProviderType;
  name: string;
  description?: string;
  basePrice?: number | null;
  priceNote?: string;
  durationEstimate?: string;
  serviceAreas?: string[];
  imageUrl?: string;
  status?: VendorServiceStatus;
  isAvailable?: boolean;
  readinessOnly?: boolean;
  internalNote?: string;
}
