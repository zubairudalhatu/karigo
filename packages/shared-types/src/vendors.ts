import type { ServiceCategory } from "./index";

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
  name: string;
  description?: string | null;
  category: string;
  serviceCategory?: ServiceCategory;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
}
