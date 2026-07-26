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

export interface PartnerOrderDetail extends Omit<PartnerOrderSummary, "customerName" | "itemsCount"> {
  subtotal: string | number;
  deliveryFee: string | number;
  customer: {
    name: string;
    phoneNumber: string;
  };
  deliveryAddress?: {
    label: string;
    addressLine: string;
    city: string;
    state: string;
    deliveryNote?: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    unitPrice: string | number;
    quantity: number;
    totalPrice: string | number;
    specialInstruction?: string | null;
  }>;
  statusHistory: Array<{
    id: string;
    newStatus: string;
    note?: string | null;
    createdAt: string;
  }>;
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
  orderDetail: (orderId: string) => api.get<PartnerOrderDetail>(`vendor-dashboard/orders/${orderId}`),
  products: () => api.get<ProductSummary[]>("vendor/products"),
  services: () => api.get<VendorServiceSummary[]>("vendors/services"),
  documents: () => api.get<PartnerOnboardingDocument[]>("vendors/onboarding-documents")
};
