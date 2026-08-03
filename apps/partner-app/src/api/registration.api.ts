import { api } from "./client";

export type VendorApplicationCategory =
  | "RESTAURANT"
  | "GROCERIES"
  | "MARKET_ITEMS"
  | "PHARMACY"
  | "PARCEL_LOGISTICS_PARTNER"
  | "SME_SERVICES"
  | "OTHER_MARKETPLACE_VENDOR";

export type PreferredContactMethod = "PHONE" | "EMAIL" | "WHATSAPP";

export interface VendorApplicationInput {
  businessCategory: VendorApplicationCategory;
  businessName: string;
  tradingName?: string;
  businessType?: string;
  businessDescription: string;
  businessAddress: string;
  state: "Kano" | "FCT";
  city: "Kano" | "Abuja";
  area?: string;
  serviceAreas?: string[];
  operatingHours?: string;
  businessPhoneNumber: string;
  businessEmail: string;
  websiteOrSocialLink?: string;
  contactFullName: string;
  contactRole: string;
  contactPhoneNumber: string;
  contactEmail: string;
  preferredContactMethod: PreferredContactMethod;
  deliveryReadiness?: string;
  deliveryPreference?: string;
  averagePreparationTime?: string;
  numberOfStaff?: string;
  catalogueCategory?: string;
  estimatedCatalogueSize?: string;
  existingDelivery?: string;
  brandAssets?: Record<string, unknown>;
  documentPlaceholders?: Record<string, unknown>;
  documents?: Array<{ documentType: string; documentName?: string; documentUrl: string }>;
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
  reviewedAt?: string | null;
  message: string;
  alreadySubmitted?: boolean;
}

export type PartnerOnboardingStage = "START" | "ACCOUNT_TYPE" | "BUSINESS" | "OPERATIONS" | "DOCUMENTS" | "REVIEW" | "SUBMITTED";

export interface PartnerOnboardingDraftInput {
  onboardingStage?: PartnerOnboardingStage;
  accountType?: string;
  draftData?: unknown;
}

export interface PartnerOnboardingResult {
  authenticated: boolean;
  userId: string;
  partnerApplicantId: string;
  partnerProfileId?: string | null;
  applicationId?: string | null;
  applicationReference?: string | null;
  applicationStatus?: string | null;
  state: string;
  onboardingStage: PartnerOnboardingStage | string;
  canEdit: boolean;
  canSubmit: boolean;
  nextRoute: string;
  message: string;
  draft?: {
    onboardingStage: PartnerOnboardingStage | string;
    accountType?: string | null;
    draftData?: unknown;
    applicationId?: string | null;
    submittedAt?: string | null;
    updatedAt: string;
  } | null;
  application?: VendorApplicationStatus | null;
}

export const registrationApi = {
  ensurePartnerOnboarding: () =>
    api.post<PartnerOnboardingResult>("vendor-applications/me/ensure"),
  savePartnerDraft: (body: PartnerOnboardingDraftInput) =>
    api.patch<PartnerOnboardingResult>("vendor-applications/me/draft", body),
  submitCurrentUserVendorApplication: (body: VendorApplicationInput) =>
    api.post<VendorApplicationStatus>("vendor-applications/me/submit", body),
  submitVendorApplication: (body: VendorApplicationInput) =>
    api.post<VendorApplicationStatus>("vendor-applications", body, { authenticated: false }),
  applicationStatus: (params: { reference?: string; phoneNumber?: string }) => {
    const query = new URLSearchParams();
    if (params.reference) query.set("reference", params.reference);
    if (params.phoneNumber) query.set("phoneNumber", params.phoneNumber);
    return api.get<VendorApplicationStatus>(`vendor-applications/status?${query.toString()}`, { authenticated: false });
  }
};
