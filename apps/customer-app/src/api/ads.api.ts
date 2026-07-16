import { api } from "./client";

export interface CustomerHomeAd {
  id: string;
  campaignReference: string;
  placementSurface: "CUSTOMER_HOME_FEATURED";
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sponsorType: "VENDOR" | "EXTERNAL";
  sponsorName: string;
  label: "Ad";
}

export interface CustomerHomeAdsResponse {
  items: CustomerHomeAd[];
  guardrails: {
    adsAreLabelled: boolean;
    liveBillingEnabled: boolean;
    walletTopUpEnabled: boolean;
    checkoutPricingAffected: boolean;
  };
}

export const adsApi = {
  customerHome: () => api.get<CustomerHomeAdsResponse>("ads/customer-home")
};
