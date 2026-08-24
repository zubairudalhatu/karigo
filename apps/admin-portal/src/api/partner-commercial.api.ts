import { api } from "./client";
import { requireCollection } from "../lib/collections";

export type PartnerCommercialModel = "COMMISSION" | "ONBOARDING_FEE" | "QUOTATION" | "REVIEW_REQUIRED";

export interface AdminPartnerCommercialPolicy {
  id: string;
  businessCategory: string;
  commercialModel: PartnerCommercialModel;
  commissionRateBasisPoints: number;
  commissionPercent: number;
  onboardingFeeKobo: number | null;
  onboardingFeeConfigured: boolean;
  renewalFeeKobo: number | null;
  currency: string;
  publicTitle: string;
  publicSummary: string;
  policyVersion: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  categoryPublicOnboardingEnabled: boolean;
  internalNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePartnerCommercialPolicyInput {
  businessCategory: string;
  commercialModel: PartnerCommercialModel;
  commissionRateBasisPoints: number;
  onboardingFeeKobo?: number | null;
  renewalFeeKobo?: number | null;
  publicTitle: string;
  publicSummary: string;
  policyVersion: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  publicOnboardingEnabled: boolean;
  internalNote?: string;
}

export const partnerCommercialApi = {
  policies: async () => requireCollection<AdminPartnerCommercialPolicy>(await api.get<unknown>("admin/partner-commercial/policies"), "Partner commercial policies"),
  createPolicyVersion: (body: UpdatePartnerCommercialPolicyInput) => api.request<AdminPartnerCommercialPolicy>("admin/partner-commercial/policies", { method: "PUT", body }),
  applicationState: (applicationId: string) => api.get<unknown>(`admin/partner-commercial/applications/${applicationId}`),
  waiveFee: (agreementId: string, reason: string, note: string) => api.post<unknown>(`admin/partner-commercial/agreements/${agreementId}/waive-onboarding-fee`, { reason, note })
};
