import type {
  ProductCategory,
  ProductSummary,
  PartnerCapabilities,
  VendorProductAvailabilityInput,
  VendorProductInput,
  VendorServiceInput,
  VendorServiceSummary
} from "@karigo/shared-types";
import { api, authSessionStore, tokenStore } from "./client";

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
  tradingName?: string | null;
  sourceApplication?: { reference: string; tradingName?: string | null } | null;
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

export interface PartnerOnboardingState {
  authenticated: boolean;
  state:
    | "approved"
    | "application_not_started"
    | "application_in_progress"
    | "application_submitted"
    | "correction_required"
    | "rejected"
    | "restricted";
  message: string;
  account?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
    role: string;
    accountStatus: string;
    phoneVerified: boolean;
  };
  partnerProfile?: Pick<PartnerProfile, "id" | "businessName" | "status"> | null;
  application?: {
    reference: string;
    businessName: string;
    businessCategory: string;
    status: string;
    submittedAt: string;
    reviewedAt?: string | null;
    message: string;
  };
  correctionNote?: string | null;
}

export type PartnerOrderSummary = import("@karigo/shared-types").PartnerOrderSummaryContract;
export type PartnerOrderDetail = import("@karigo/shared-types").PartnerOrderDetailContract;

export interface PartnerOnboardingDocument {
  id: string;
  documentType: string;
  documentName?: string | null;
  documentUrl: string;
  verificationStatus: string;
  adminNote?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
  applicationType?: "PARTNER";
  applicationReference?: string | null;
  roleScope?: "PARTNER";
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
  commercialModel?: "COMMISSION" | "ONBOARDING_FEE" | "QUOTATION" | "REVIEW_REQUIRED" | null;
  commercialPlan?: string | null;
  policyVersion?: string | null;
  commissionableSubtotal?: string | number | null;
  deliveryFeeExcluded?: string | number | null;
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

export interface PartnerCommercialState {
  agreement: {
    id: string;
    category: string;
    policyVersion: string;
    commercialModel: "COMMISSION" | "ONBOARDING_FEE" | "QUOTATION" | "REVIEW_REQUIRED";
    commissionPercent: number;
    onboardingFeeKobo: number | null;
    currency: string;
    publicTitle: string;
    publicSummary: string;
    acceptedAt: string;
  } | null;
  feeState: "NOT_APPLICABLE" | "FEE_NOT_CONFIGURED" | "PENDING" | "PAID" | "WAIVED" | null;
  activationEligible: boolean;
  blockers: string[];
  payments?: Array<{
    reference: string;
    provider: string;
    amountKobo: number;
    currency: string;
    status: string;
    checkoutUrl?: string | null;
    verifiedAt?: string | null;
  }>;
}

export interface PartnerOnboardingPaymentResult {
  payment: { reference: string; status: string; amountKobo: number; currency: string; checkoutUrl?: string | null };
  authorization?: { reference: string; authorizationUrl?: string | null; checkoutUrl?: string | null };
  recovered?: boolean;
  alreadyProcessed?: boolean;
  receipt?: Record<string, unknown>;
}

export interface PayoutAccountPayload {
  accountName: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  confirmAccountNumber: string;
}

export const partnerApi = {
  onboardingState: () => api.get<PartnerOnboardingState>("partner-mobile/onboarding/status"),
  capabilities: () => api.get<PartnerCapabilities>("vendors/capabilities"),
  profile: () => api.get<PartnerProfile>("vendors/me"),
  updateProfile: (body: PartnerProfileUpdateInput) => api.patch<PartnerProfile>("vendors/me", body),
  orders: () => api.get<PartnerOrderSummary[]>("vendor-dashboard/orders", { timeoutMs: 10000 }),
  orderDetail: (orderId: string) => api.get<PartnerOrderDetail>(`vendor-dashboard/orders/${orderId}`, { timeoutMs: 10000 }),
  orderAction: async (orderId: string, action: import("@karigo/shared-types").PartnerOrderAction, version: import("@karigo/shared-types").PartnerOrderVersion, reason?: import("@karigo/shared-types").PartnerOrderRejectionReason, details?: string) => {
    const generation = authSessionStore.currentGeneration();
    const accessToken = await tokenStore.getToken();
    if (!accessToken || !authSessionStore.isCurrent(generation)) throw new Error("Partner session changed. Refresh and confirm again.");
    // Pin this write to the confirming session. Reads may refresh auth, but a
    // write never switches accounts or replays automatically after a refresh.
    return api.post<PartnerOrderDetail>(`vendor-dashboard/orders/${orderId}/${action}`, { ...version, ...(action === "reject" ? { reason, details } : {}) },
      { authenticated: false, headers: { Authorization: `Bearer ${accessToken}` }, timeoutMs: 15000, retryOnNetworkFailure: false, retryOnTemporaryFailure: false });
  },
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
  service: (serviceId: string) => api.get<VendorServiceSummary>(`vendors/services/${serviceId}`),
  createService: (body: VendorServiceInput) => api.post<VendorServiceSummary>("vendors/services", body),
  updateService: (serviceId: string, body: Partial<VendorServiceInput>) => api.patch<VendorServiceSummary>(`vendors/services/${serviceId}`, body),
  archiveService: (serviceId: string) => api.delete<VendorServiceSummary>(`vendors/services/${serviceId}`),
  removeDocument: (id: string) => api.delete(`partner-mobile/onboarding/files/${id}`),
  documents: () => api.get<PartnerOnboardingDocument[]>("partner-mobile/onboarding/files"),
  uploadOnboardingDocument: (body: { documentType: string; documentName?: string; documentUrl: string }) =>
    api.post<PartnerOnboardingDocument>("partner-mobile/onboarding/documents", body),
  settlements: (status: VendorSettlementFilter = "ALL") =>
    api.get<VendorSettlementsResult>(`vendor/settlements${status === "ALL" ? "" : `?status=${status}`}`),
  commercialState: () => api.get<PartnerCommercialState>("partner-commercial/me"),
  initializeOnboardingPayment: () => api.post<PartnerOnboardingPaymentResult>("partner-commercial/me/onboarding-payments"),
  verifyOnboardingPayment: (reference: string) =>
    api.get<PartnerOnboardingPaymentResult>(`partner-commercial/me/onboarding-payments/${encodeURIComponent(reference)}/verify`),

  payoutAccount: () => api.get<VendorPayoutAccount | null>("vendor/payout-account"),
  createPayoutAccount: (payload: PayoutAccountPayload) => api.post<VendorPayoutAccount>("vendor/payout-account", payload),
  updatePayoutAccount: (payload: PayoutAccountPayload) => api.patch<VendorPayoutAccount>("vendor/payout-account", payload)
};
