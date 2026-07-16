import { api } from "./client";
import type { Address } from "./addresses.api";

export type ServiceProviderType =
  | "PAINTER"
  | "PLUMBER"
  | "MECHANIC"
  | "ELECTRICIAN"
  | "CLEANER"
  | "CARPENTER"
  | "AC_TECHNICIAN"
  | "GENERATOR_REPAIR"
  | "APPLIANCE_REPAIR"
  | "FUMIGATION"
  | "WELDER"
  | "TILER"
  | "CCTV_TECHNICIAN"
  | "MOVING_HELP"
  | "HEALTH_PROFESSIONAL"
  | "OTHER";

export interface ServiceProviderCategory {
  type: ServiceProviderType;
  label: string;
  description: string;
  readinessOnly: boolean;
  statusLabel: string;
}

export interface ServiceProviderRequestInput {
  serviceType: ServiceProviderType;
  serviceAddressId: string;
  preferredProviderId?: string;
  description: string;
  contactPhone: string;
  preferredDate?: string;
  preferredTimeWindow?: string;
  customerNote?: string;
}

export type ServiceProviderRequestStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PROVIDER_MATCHING"
  | "PROVIDER_ASSIGNED"
  | "COMPLETED"
  | "CANCELLED";

export interface PublicServiceProvider {
  id: string;
  providerCode: string;
  displayName: string;
  serviceType: ServiceProviderType;
  city: string;
  state: string;
  serviceAreas: string[];
  publicBio?: string | null;
  profileImageUrl?: string | null;
  averageRating?: number | null;
  reviewCount: number;
  completedServices: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProviderMarketplaceResponse {
  items: PublicServiceProvider[];
  guardrails: {
    liveDispatchEnabled: boolean;
    providerLoginEnabled: boolean;
    paymentRequiredNow: boolean;
    privateProviderContactExposed: boolean;
    note: string;
  };
}

export interface ServiceProviderReviewInput {
  rating: number;
  comment?: string;
}

export interface ServiceProviderReview {
  id: string;
  requestId?: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  provider?: PublicServiceProvider;
}

export interface ServiceProviderRequest {
  id: string;
  requestNumber: string;
  serviceType: ServiceProviderType;
  serviceLabel: string;
  description?: string;
  contactPhone?: string;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  customerNote?: string | null;
  customerUpdateNote?: string | null;
  status: ServiceProviderRequestStatus;
  readinessOnly: boolean;
  preferredProvider?: PublicServiceProvider | null;
  assignedProvider?: PublicServiceProvider | null;
  review?: ServiceProviderReview | null;
  serviceAddress: Pick<Address, "id" | "label" | "addressLine" | "city" | "state" | "country">;
  createdAt: string;
  updatedAt: string;
}

export const serviceProviderRequestsApi = {
  catalogue: () => api.get<ServiceProviderCategory[]>("service-provider-requests/catalogue"),
  providers: (query: { serviceType?: ServiceProviderType; city?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (query.serviceType) params.set("serviceType", query.serviceType);
    if (query.city) params.set("city", query.city);
    if (query.search) params.set("search", query.search);
    const qs = params.toString();
    return api.get<ServiceProviderMarketplaceResponse>(`service-provider-requests/providers${qs ? `?${qs}` : ""}`);
  },
  create: (body: ServiceProviderRequestInput) => api.post<ServiceProviderRequest>("service-provider-requests", body),
  mine: () => api.get<ServiceProviderRequest[]>("service-provider-requests/my-requests"),
  detail: (id: string) => api.get<ServiceProviderRequest>(`service-provider-requests/${id}`),
  review: (id: string, body: ServiceProviderReviewInput) => api.post<ServiceProviderReview>(`service-provider-requests/${id}/review`, body)
};
