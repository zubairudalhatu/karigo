import { api } from "./client";
import { partnerDraft } from "@karigo/shared-types";

export type VendorApplicationCategory =
  | "RESTAURANT"
  | "GROCERIES"
  | "MARKET_ITEMS"
  | "PHARMACY"
  | "PARCEL_LOGISTICS_PARTNER"
  | "SME_SERVICES"
  | "OTHER_MARKETPLACE_VENDOR";

export type PreferredContactMethod = "PHONE" | "EMAIL" | "WHATSAPP";
export type PartnerCommercialModel = "COMMISSION" | "ONBOARDING_FEE" | "QUOTATION" | "REVIEW_REQUIRED";

export interface PartnerCommercialPolicy {
  id: string;
  businessCategory: VendorApplicationCategory;
  commercialModel: PartnerCommercialModel;
  commissionRateBasisPoints: number;
  commissionPercent: number;
  onboardingFeeKobo: number | null;
  onboardingFeeConfigured: boolean;
  renewalFeeKobo: number | null;
  currency: "NGN";
  publicTitle: string;
  publicSummary: string;
  policyVersion: string;
  termsVersion: string;
  effectiveFrom: string;
  publicOnboardingEnabled: boolean;
  categoryPublicOnboardingEnabled: boolean;
  visibleInPublicCategorySelection: boolean;
}


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
  commercialPolicyId: string;
  commercialTermsAccepted: boolean;
  acceptedTermsVersion: string;
  acceptedFromAppSurface: "partner-mobile-app";
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
  commercialPolicies: () => api.get<PartnerCommercialPolicy[]>("partner-commercial/policies", { authenticated: false }),
  ensurePartnerOnboarding: () =>
    api.post<PartnerOnboardingResult>("partner-mobile/onboarding/ensure"),
  savePartnerDraft: (body: PartnerOnboardingDraftInput) =>
    api.patch<PartnerOnboardingResult>("partner-mobile/onboarding/draft", { ...body, draftData: body.draftData === undefined ? undefined : partnerDraft(body.draftData) }),
  submitCurrentUserVendorApplication: (body: VendorApplicationInput) =>
    api.post<VendorApplicationStatus>("partner-mobile/onboarding/submit", body),
  submitVendorApplication: (body: VendorApplicationInput) =>
    api.post<VendorApplicationStatus>("partner-mobile/onboarding/submit", body),
  applicationStatus: async () => {
    const state = await api.get<PartnerOnboardingResult>("partner-mobile/onboarding/status");
    return state.application ?? null;
  }
};
