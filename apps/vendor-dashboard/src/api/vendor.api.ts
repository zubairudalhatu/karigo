import { api } from "./client";
import { tokenStore } from "./client";
import type { ApiErrorResponse, ApiSuccessResponse, VendorServiceInput, VendorServiceSummary, VendorUploadPurpose, VendorUploadResult } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";

export interface VendorProfile { id: string; businessName: string; description?: string | null; phoneNumber: string; email?: string | null; address: string; city: string; state: string; status: string; isOpen: boolean; openingTime?: string | null; closingTime?: string | null; logoUrl?: string | null; coverImageUrl?: string | null; }
export interface VendorBranch { id: string; name: string; address: string; city: string; state: string; area?: string | null; phoneNumber?: string | null; isPrimary: boolean; status: string; createdAt: string; }
export interface VendorTeamMember { id: string; fullName: string; email?: string | null; phoneNumber?: string | null; role: string; invitationStatus: string; expiresAt?: string | null; createdAt: string; invitationIssued?: boolean; invitationTokenReturned?: boolean; }
export interface VendorAuditLog { id: string; action: string; entityType: string; entityId?: string | null; newValue?: unknown; createdAt: string; actor?: { fullName: string } | null; }
export interface VendorOnboardingDocument { id: string; documentType: string; documentName?: string | null; documentUrl: string; verificationStatus: string; adminNote?: string | null; uploadedAt: string; reviewedAt?: string | null; }

async function uploadVendorFile(file: File, purpose: VendorUploadPurpose) {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", file);
  const token = await tokenStore.getToken();
  const response = await fetch(`${api.baseUrl}/vendors/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  });
  const payload = (await response.json().catch(() => null)) as ApiSuccessResponse<VendorUploadResult> | ApiErrorResponse | null;
  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload : undefined;
    throw new KariGoApiError(error?.message || `Upload failed with status ${response.status}`, error?.error_code, response.status, error?.details);
  }
  return payload.data;
}

export const vendorApi = {
  profile: () => api.get<VendorProfile>("vendors/me"),
  update: (body: Partial<VendorProfile>) => api.patch<VendorProfile>("vendors/me", body),
  branches: () => api.get<VendorBranch[]>("vendors/branches"),
  createBranch: (body: Partial<VendorBranch>) => api.post<VendorBranch>("vendors/branches", body),
  updateBranch: (id: string, body: Partial<VendorBranch>) => api.patch<VendorBranch>(`vendors/branches/${id}`, body),
  team: () => api.get<VendorTeamMember[]>("vendors/team"),
  inviteTeamMember: (body: { fullName: string; email?: string; phoneNumber?: string; role: string }) => api.post<VendorTeamMember>("vendors/team", body),
  updateTeamMember: (id: string, body: { role: string }) => api.patch<VendorTeamMember>(`vendors/team/${id}`, body),
  revokeTeamMember: (id: string) => api.patch<VendorTeamMember>(`vendors/team/${id}/revoke`, {}),
  auditLogs: () => api.get<VendorAuditLog[]>("vendors/audit-logs"),
  onboardingDocuments: () => api.get<VendorOnboardingDocument[]>("vendors/onboarding-documents"),
  uploadOnboardingDocument: (body: { documentType: string; documentName?: string; documentUrl: string }) => api.post<VendorOnboardingDocument>("vendors/onboarding-documents", body),
  uploadFile: uploadVendorFile,
  services: () => api.get<VendorServiceSummary[]>("vendors/services"),
  createService: (body: VendorServiceInput) => api.post<VendorServiceSummary>("vendors/services", body),
  updateService: (id: string, body: Partial<VendorServiceInput>) => api.patch<VendorServiceSummary>(`vendors/services/${id}`, body),
  archiveService: (id: string) => api.delete<VendorServiceSummary>(`vendors/services/${id}`)
};
