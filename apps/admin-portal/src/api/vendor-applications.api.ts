import { api } from "./client";

export interface VendorApplicationDocument {
  id: string;
  documentType: string;
  documentName?: string | null;
  documentUrl: string;
  verificationStatus: string;
}

export interface VendorApplication {
  id: string;
  reference: string;
  businessName: string;
  businessCategory: string;
  businessEmail: string;
  city: string;
  state: string;
  contactFullName: string;
  contactEmail: string;
  status: string;
  submittedAt: string;
  documents?: VendorApplicationDocument[];
  applicant?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
    accountStatus: string;
    phoneVerified: boolean;
    onboardingPasswordSetAt?: string | null;
  } | null;
  vendor?: {
    id: string;
    businessName: string;
    status: string;
    user: { accountStatus: string; email?: string | null; phoneNumber: string };
    activationInvitations?: Array<{ id: string; status: string; expiresAt: string; usedAt?: string | null; revokedAt?: string | null; createdAt: string }>;
  } | null;
}

export const vendorApplicationsApi = {
  list: () => api.get<VendorApplication[]>("admin/vendor-applications"),
  review: (id: string, status: string, notes?: string) => api.patch<VendorApplication>(`admin/vendor-applications/${id}`, { status, notes })
};
