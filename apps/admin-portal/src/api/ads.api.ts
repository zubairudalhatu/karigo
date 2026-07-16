import { api } from "./client";

export type AdCampaignStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED";
export type AdSponsorType = "VENDOR" | "EXTERNAL";

export interface AdminAdCampaign {
  id: string;
  campaignReference: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sponsorType: AdSponsorType;
  sponsorName: string;
  advertiserName?: string | null;
  advertiserContactName?: string | null;
  advertiserEmail?: string | null;
  advertiserPhone?: string | null;
  requestedBudgetKobo: number;
  reservedCreditKobo: number;
  status: AdCampaignStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: { id: string; businessName: string; logoUrl?: string | null; city: string; state: string } | null;
}

export interface AdminAdsResponse {
  summary: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    active: number;
    rejected: number;
  };
  items: AdminAdCampaign[];
  guardrails: {
    livePaymentsEnabled: boolean;
    liveWalletTopUpEnabled: boolean;
    automaticAdBillingEnabled: boolean;
    adminApprovalRequired: boolean;
    note: string;
  };
}

export interface AdCampaignInput {
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  requestedBudgetKobo?: number;
  sponsorType?: AdSponsorType;
  vendorId?: string;
  advertiserName?: string;
  advertiserContactName?: string;
  advertiserEmail?: string;
  advertiserPhone?: string;
  status?: AdCampaignStatus;
  startsAt?: string;
  endsAt?: string;
}

export interface AdCampaignUpdateInput extends Partial<AdCampaignInput> {
  reservedCreditKobo?: number;
  adminNote?: string;
  rejectionReason?: string;
}

export const adsApi = {
  list: () => api.get<AdminAdsResponse>("admin/ads"),
  create: (body: AdCampaignInput) => api.post<AdminAdCampaign>("admin/ads", body),
  update: (id: string, body: AdCampaignUpdateInput) => api.patch<AdminAdCampaign>(`admin/ads/${id}`, body),
  grantVendorCredit: (vendorId: string, body: { amountKobo: number; description?: string }) => api.post("admin/ads/vendor-credit/" + vendorId, body)
};
