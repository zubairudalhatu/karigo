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

export type ServiceProviderStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "SUSPENDED"
  | "INACTIVE";

export type ServiceProviderApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED_TO_PROVIDER";

export interface SmeProvider {
  id: string;
  providerCode: string;
  fullName: string;
  businessName?: string | null;
  serviceType: ServiceProviderType;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  status: ServiceProviderStatus;
  readinessOnly: boolean;
  notes?: string | null;
  verificationNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmeProviderApplication {
  id: string;
  applicationReference: string;
  fullName: string;
  businessName?: string | null;
  serviceType: ServiceProviderType;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  serviceAreas: string[];
  address?: string | null;
  experienceSummary?: string | null;
  toolsOrEquipment?: string | null;
  availability?: string | null;
  identificationType?: string | null;
  identificationNumber?: string | null;
  status: ServiceProviderApplicationStatus;
  reviewNote?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByAdmin?: { id: string; fullName: string; email?: string | null } | null;
  convertedProvider?: Pick<SmeProvider, "id" | "providerCode" | "fullName" | "serviceType" | "status" | "readinessOnly"> | null;
}

export interface SmeProvidersListResponse {
  summary: {
    total: number;
    pendingReview: number;
    approved: number;
    suspended: number;
    inactive: number;
  };
  items: SmeProvider[];
}

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
  assignmentNote?: string | null;
  assignedAt?: string | null;
  assignedProvider?: SmeProvider | null;
  assignedByAdmin?: { id: string; fullName: string; email?: string | null };
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
    api.patch<SmeServiceRequest>(`admin/service-provider-requests/${id}/status`, { status, adminNote }),
  assignProvider: (id: string, providerId: string, assignmentNote?: string) =>
    api.patch<SmeServiceRequest>(`admin/service-provider-requests/${id}/provider-assignment`, { providerId, assignmentNote }),
  providers: (q = "") => api.get<SmeProvidersListResponse>(`admin/service-providers${q ? `?${q}` : ""}`),
  provider: (id: string) => api.get<SmeProvider>(`admin/service-providers/${id}`),
  createProvider: (payload: Partial<SmeProvider>) => api.post<SmeProvider>("admin/service-providers", payload),
  updateProvider: (id: string, payload: Partial<SmeProvider>) => api.patch<SmeProvider>(`admin/service-providers/${id}`, payload),
  providerApplications: (q = "") => api.get<SmeProviderApplication[]>(`admin/service-provider-applications${q ? `?${q}` : ""}`),
  providerApplication: (id: string) => api.get<SmeProviderApplication>(`admin/service-provider-applications/${id}`),
  updateProviderApplicationStatus: (id: string, status: ServiceProviderApplicationStatus, reviewNote?: string) =>
    api.patch<SmeProviderApplication>(`admin/service-provider-applications/${id}/status`, { status, reviewNote }),
  approveCreateProviderFromApplication: (id: string, payload?: { reviewNote?: string; providerNote?: string; verificationNote?: string }) =>
    api.post<SmeProviderApplication>(`admin/service-provider-applications/${id}/approve-create-provider`, payload ?? {})
};
