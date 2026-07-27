import type {
  ProductCategory,
  ProductSummary,
  VendorProductAvailabilityInput,
  VendorProductInput,
  VendorServiceSummary
} from "@karigo/shared-types";
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
  openingTime?: string | null;
  closingTime?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

export type PartnerProfileUpdateInput = Partial<Pick<
  PartnerProfile,
  | "businessName"
  | "description"
  | "phoneNumber"
  | "email"
  | "address"
  | "city"
  | "state"
  | "isOpen"
  | "openingTime"
  | "closingTime"
  | "logoUrl"
  | "coverImageUrl"
>>;

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

export type VendorSettlementStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
export type VendorSettlementFilter = "ALL" | "PENDING" | "PAID";

export interface VendorSettlementSummary {
  totalSettlements: number;
  pendingPayout: string | number;
  paidOut: string | number;
}

export interface VendorSettlement {
  id: string;
  orderNumber: string;
  orderCompletedAt?: string | null;
  grossOrderSubtotal: string | number;
  deliveryFee?: string | number | null;
  commissionRate: string | number;
  platformFee: string | number;
  settlementAmount: string | number;
  settlementStatus: VendorSettlementStatus;
  paidAt?: string | null;
  payoutReference?: string | null;
  createdAt: string;
}

export interface VendorSettlementsResult {
  summary: VendorSettlementSummary;
  items: VendorSettlement[];
}

export type PayoutAccountStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "NEEDS_UPDATE";

export interface VendorPayoutAccount {
  id: string;
  accountName: string;
  bankName: string;
  bankCode?: string | null;
  maskedAccountNumber: string;
  status: PayoutAccountStatus;
  submittedAt: string;
  verifiedAt?: string | null;
  vendorVisibleNote?: string | null;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface PayoutAccountPayload {
  accountName: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  confirmAccountNumber: string;
}

export const partnerApi = {
  profile: () => api.get<PartnerProfile>("vendors/me"),
  updateProfile: (body: PartnerProfileUpdateInput) => api.patch<PartnerProfile>("vendors/me", body),
  orders: () => api.get<PartnerOrderSummary[]>("vendor-dashboard/orders"),
  orderDetail: (orderId: string) => api.get<PartnerOrderDetail>(`vendor-dashboard/orders/${orderId}`),
  products: (params?: { productCategory?: ProductCategory; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.productCategory) query.set("category", params.productCategory);
    if (params?.search) query.set("search", params.search);
    return api.get<ProductSummary[]>(`vendor/products${query.size ? `?${query.toString()}` : ""}`);
  },
  product: (productId: string) => api.get<ProductSummary>(`vendor/products/${productId}`),
  createProduct: (body: VendorProductInput) => api.post<ProductSummary>("vendor/products", body),
  updateProduct: (productId: string, body: Partial<VendorProductInput>) => api.patch<ProductSummary>(`vendor/products/${productId}`, body),
  updateProductAvailability: (productId: string, body: VendorProductAvailabilityInput) =>
    api.patch<ProductSummary>(`vendor/products/${productId}/availability`, body),
  services: () => api.get<VendorServiceSummary[]>("vendors/services"),
  documents: () => api.get<PartnerOnboardingDocument[]>("vendors/onboarding-documents"),
  uploadOnboardingDocument: (body: { documentType: string; documentName?: string; documentUrl: string }) =>
    api.post<PartnerOnboardingDocument>("vendors/onboarding-documents", body),
  settlements: (status: VendorSettlementFilter = "ALL") =>
    api.get<VendorSettlementsResult>(`vendor/settlements${status === "ALL" ? "" : `?status=${status}`}`),
  payoutAccount: () => api.get<VendorPayoutAccount | null>("vendor/payout-account"),
  createPayoutAccount: (payload: PayoutAccountPayload) => api.post<VendorPayoutAccount>("vendor/payout-account", payload),
  updatePayoutAccount: (payload: PayoutAccountPayload) => api.patch<VendorPayoutAccount>("vendor/payout-account", payload)
};
