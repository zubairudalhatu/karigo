import { api } from "./client";

export type AdCampaignStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "SCHEDULED" | "REJECTED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
export type AdSponsorType = "VENDOR" | "EXTERNAL";
export type AdPerformanceRange = "TODAY" | "DAYS_7" | "DAYS_30" | "LIFETIME";

export interface AdPerformanceBucket {
  date: string;
  impressions: number;
  clicks: number;
  spendKobo: number;
  ctr: number;
}

export interface AdminAdRevisionPresentation {
  id: string;
  revisionNumber: number;
  status: AdCampaignStatus;
  title: string;
  body: string;
  imageUrl?: string | null;
  creativeAltText?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  requestedBudgetKobo: number;
  dailyBudgetKobo?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  placementSurface: string;
  targeting?: { cityCodes?: string[]; serviceCategories?: string[] } | null;
  createdByType: string;
  changeReason?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
}

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
  dailyBudgetKobo?: number | null;
  spentKobo: number;
  remainingBudgetKobo: number;
  analytics: { impressions: number; clicks: number; spendKobo: number; ctr: number };
  performance?: { range: AdPerformanceRange; timezone: string; buckets: AdPerformanceBucket[] };
  reviewRevision?: AdminAdRevisionPresentation | null;
  approvedRevision?: AdminAdRevisionPresentation | null;
  currentRevisionNumber: number;
  pendingRevisionStatus?: AdCampaignStatus | null;
  revisions: Array<{ id: string; revisionNumber: number; createdByType: string; changeReason?: string | null; reviewNotes?: string | null; createdAt: string }>;
  auditEvents: Array<{ id: string; action: string; fromStatus?: AdCampaignStatus | null; toStatus?: AdCampaignStatus | null; reason?: string | null; createdAt: string }>;
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
  performance: {
    range: AdPerformanceRange;
    timezone: string;
    buckets: AdPerformanceBucket[];
    spendPolicy: string;
  };
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
  dailyBudgetKobo?: number;
  creativeAltText?: string;
  targeting?: { cityCodes?: string[]; serviceCategories?: string[] };
}

export interface AdCampaignUpdateInput extends Partial<AdCampaignInput> {
  reservedCreditKobo?: number;
  adminNote?: string;
  rejectionReason?: string;
  changeReason?: string;
}

export const adsApi = {
  list: (range: AdPerformanceRange = "DAYS_7") => api.get<AdminAdsResponse>(`admin/ads?range=${range}`),
  create: (body: AdCampaignInput) => api.post<AdminAdCampaign>("admin/ads", body),
  update: (id: string, body: AdCampaignUpdateInput) => api.patch<AdminAdCampaign>(`admin/ads/${id}`, body),
  action: (id: string, status: AdCampaignStatus, reason?: string) => api.post<AdminAdCampaign>(`admin/ads/${id}/actions`, { status, reason }),
  grantVendorCredit: (vendorId: string, body: { amountKobo: number; description?: string }) => api.post("admin/ads/vendor-credit/" + vendorId, body)
};
