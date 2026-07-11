import { api } from "./client";

export type ServiceProviderRequestStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PROVIDER_MATCHING"
  | "PROVIDER_ASSIGNED"
  | "COMPLETED"
  | "CANCELLED";

export type ServiceProviderType =
  | "PAINTER"
  | "PLUMBER"
  | "MECHANIC"
  | "ELECTRICIAN"
  | "CLEANER"
  | "CARPENTER"
  | "AC_TECHNICIAN"
  | "GENERATOR_REPAIR"
  | "HEALTH_PROFESSIONAL"
  | "OTHER";

export interface SmeServiceRequest {
  id: string;
  requestNumber: string;
  serviceType: ServiceProviderType;
  serviceLabel: string;
  description: string;
  contactPhone: string;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  customerNote?: string | null;
  status: ServiceProviderRequestStatus;
  readinessOnly: boolean;
  adminNote?: string | null;
  customer: {
    id: string;
    user: { id: string; fullName: string; phoneNumber: string; email?: string | null };
  };
  serviceAddress: {
    id: string;
    label: string;
    addressLine: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  reviewHistory?: Array<{
    id: string;
    action: string;
    newValue: unknown;
    createdAt: string;
    adminUser?: { fullName: string; email?: string | null } | null;
  }>;
}

export interface SmeServicesListResponse {
  summary: {
    total: number;
    submitted: number;
    underReview: number;
    providerMatching: number;
    providerAssigned: number;
    completed: number;
    cancelled: number;
  };
  items: SmeServiceRequest[];
}

export const smeServicesApi = {
  list: (q = "") => api.get<SmeServicesListResponse>(`admin/service-provider-requests${q ? `?${q}` : ""}`),
  detail: (id: string) => api.get<SmeServiceRequest>(`admin/service-provider-requests/${id}`),
  status: (id: string, status: ServiceProviderRequestStatus, adminNote?: string) =>
    api.patch<SmeServiceRequest>(`admin/service-provider-requests/${id}/status`, { status, adminNote })
};
