import { api } from "./client";

export type VendorAdCampaignStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED";

export interface VendorAdCampaign {
  id: string;
  campaignReference: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sponsorName: string;
  requestedBudgetKobo: number;
  reservedCreditKobo: number;
  status: VendorAdCampaignStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAdCreditAccount {
  balanceKobo: number;
  reservedKobo: number;
  availableKobo: number;
  lifetimeGrantedKobo: number;
  lifetimeSpentKobo: number;
  updatedAt: string;
}

export interface VendorAdsResponse {
  creditAccount: VendorAdCreditAccount;
  campaigns: VendorAdCampaign[];
  guardrails: {
    livePaymentsEnabled: boolean;
    liveWalletTopUpEnabled: boolean;
    automaticAdBillingEnabled: boolean;
    adminApprovalRequired: boolean;
    note: string;
  };
}

export interface VendorAdCampaignInput {
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  requestedBudgetKobo?: number;
  startsAt?: string;
  endsAt?: string;
}

export const adsApi = {
  dashboard: () => api.get<VendorAdsResponse>("vendor/ads"),
  create: (body: VendorAdCampaignInput) => api.post<VendorAdCampaign>("vendor/ads", body)
};
