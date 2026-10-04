import { loadPrivateAdCreative } from "../lib/private-ad-creative";
import { API_BASE_URL, api, tokenStore } from "./client";

export interface CustomerHomeAd {
  id: string;
  campaignReference: string;
  placementSurface: "CUSTOMER_HOME_FEATURED";
  title: string;
  body: string;
  imageUrl?: string | null;
  creativeAltText?: string | null;
  ctaLabel?: string | null;
  hasDestination: boolean;
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
  customerHome: async () => {
    const response = await api.get<CustomerHomeAdsResponse>("ads/customer-home");
    return {
      ...response,
      items: response.items.map((item) => ({
        ...item,
        imageUrl: item.imageUrl?.startsWith("/") ? `${API_BASE_URL}${item.imageUrl}` : item.imageUrl
      }))
    };
  },
  loadCreative: async (source: string) => loadPrivateAdCreative(source, API_BASE_URL, await tokenStore.getToken()),
  recordEvent: (campaignId: string, eventType: "IMPRESSION" | "CLICK", renderToken: string) => api.post<{ recorded: true; destination?: string }>(`ads/${campaignId}/events`, { eventType, placement: "CUSTOMER_HOME_FEATURED", renderToken })
};
