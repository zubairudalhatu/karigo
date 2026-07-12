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
  serviceAddress: Pick<Address, "id" | "label" | "addressLine" | "city" | "state" | "country">;
  createdAt: string;
  updatedAt: string;
}

export const serviceProviderRequestsApi = {
  catalogue: () => api.get<ServiceProviderCategory[]>("service-provider-requests/catalogue"),
  create: (body: ServiceProviderRequestInput) => api.post<ServiceProviderRequest>("service-provider-requests", body),
  mine: () => api.get<ServiceProviderRequest[]>("service-provider-requests/my-requests"),
  detail: (id: string) => api.get<ServiceProviderRequest>(`service-provider-requests/${id}`)
};
