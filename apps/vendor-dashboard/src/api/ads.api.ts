import { api, csrfHeaders } from "./client";

export type VendorAdCampaignStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "SCHEDULED" | "REJECTED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED" | "CANCELLED";

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
  dailyBudgetKobo?: number | null;
  spentKobo: number;
  remainingBudgetKobo: number;
  analytics: { impressions: number; clicks: number; ctr: number; spendKobo: number };
  status: VendorAdCampaignStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevisionNumber: number;
  revisions: Array<{ id: string; revisionNumber: number; createdByType: "VENDOR" | "ADMIN" | "SYSTEM"; changeReason?: string | null; reviewNotes?: string | null; submittedAt?: string | null; approvedAt?: string | null; publishedAt?: string | null; createdAt: string }>;
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
  dailyBudgetKobo?: number;
  startsAt?: string;
  endsAt?: string;
  creativeAltText?: string;
  targeting?: { cityCodes?: string[]; serviceCategories?: string[] };
  changeReason?: string;
}

async function uploadCreative(campaignId: string, creative: File) {
  const body = new FormData(); body.append("creative", creative);
  const response = await fetch(`/api/bff/vendor/ads/${campaignId}/creative`, { method: "POST", body, headers: csrfHeaders() });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.message ?? "Creative upload failed.");
  return payload.data as { id: string; width: number; height: number; byteSize: number; metadataStripped: boolean };
}

export const adsApi = {
  dashboard: () => api.get<VendorAdsResponse>("vendor/ads"),
  create: (body: VendorAdCampaignInput) => api.post<VendorAdCampaign>("vendor/ads", body),
  update: (id: string, body: Partial<VendorAdCampaignInput>) => api.patch<VendorAdCampaign>(`vendor/ads/${id}`, body),
  action: (id: string, status: VendorAdCampaignStatus, reason?: string) => api.post<VendorAdCampaign>(`vendor/ads/${id}/actions`, { status, reason }),
  uploadCreative
};
