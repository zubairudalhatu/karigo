import type { ProductSummary, VendorServiceSummary } from "@karigo/shared-types";
import { api } from "./client";

export interface PartnerProfile {
  id: string;
  businessName: string;
  description?: string | null;
  phoneNumber: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  status: string;
  isOpen: boolean;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

export interface PartnerOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  serviceCategory: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  totalAmount: string | number;
  createdAt: string;
  itemsCount: number;
  availableActions: string[];
}

export interface PartnerOnboardingDocument {
  id: string;
  documentType: string;
  documentName?: string | null;
  documentUrl: string;
  verificationStatus: string;
  adminNote?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
}

export const partnerApi = {
  profile: () => api.get<PartnerProfile>("vendors/me"),
  orders: () => api.get<PartnerOrderSummary[]>("vendor-dashboard/orders"),
  products: () => api.get<ProductSummary[]>("vendor/products"),
  services: () => api.get<VendorServiceSummary[]>("vendors/services"),
  documents: () => api.get<PartnerOnboardingDocument[]>("vendors/onboarding-documents")
};
