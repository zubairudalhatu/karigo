import { api } from "./client";

export type VendorApplicationCategory =
  | "RESTAURANT"
  | "GROCERIES"
  | "MARKET_ITEMS"
  | "PHARMACY"
  | "PARCEL_LOGISTICS_PARTNER"
  | "SME_SERVICES"
  | "OTHER_MARKETPLACE_VENDOR";

export interface VendorApplicationInput {
  businessCategory: VendorApplicationCategory;
  businessName: string;
  businessDescription: string;
  businessAddress: string;
  state: string;
  city: string;
  area?: string;
  businessPhoneNumber: string;
  businessEmail: string;
  contactFullName: string;
  contactRole: string;
  contactPhoneNumber: string;
  contactEmail: string;
  preferredContactMethod: "PHONE" | "EMAIL" | "WHATSAPP";
  deliveryReadiness?: string;
  deliveryPreference?: string;
  catalogueCategory?: string;
  estimatedCatalogueSize?: string;
  declarationAccepted: boolean;
  privacyAccepted: boolean;
  contactConsentAccepted: boolean;
}

export interface VendorApplicationStatus {
  reference: string;
  businessName: string;
  businessCategory: VendorApplicationCategory;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  message: string;
}

export const vendorApplicationsApi = {
  create: (body: VendorApplicationInput) => api.post<VendorApplicationStatus>("vendor-applications", body, { authenticated: false }),
  status: (reference: string, email: string) => api.get<VendorApplicationStatus>(`vendor-applications/status?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`, { authenticated: false })
};
