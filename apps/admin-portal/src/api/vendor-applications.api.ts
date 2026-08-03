import { api } from "./client";
import { requireCollection } from "../lib/collections";

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
  businessType?: string | null;
  catalogueCategory?: string | null;
  businessEmail: string;
  city: string;
  state: string;
  contactFullName: string;
  contactEmail: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  deletedAt?: string | null;
  restoredAt?: string | null;
  trashReason?: string | null;
  trashNote?: string | null;
  trashedByAdminId?: string | null;
  restoredByAdminId?: string | null;
  inTrash?: boolean;
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

export type VendorApplicationTrashFilter = "active" | "trashed" | "all";

export const vendorApplicationsApi = {
  list: async (trash: VendorApplicationTrashFilter = "active") =>
    requireCollection<VendorApplication>(await api.get<unknown>(`admin/vendor-applications?trash=${trash}`), "vendor applications"),
  review: (id: string, status: string, notes?: string) => api.patch<VendorApplication>(`admin/vendor-applications/${id}`, { status, notes }),
  trash: (id: string, reason: string, note?: string) => api.patch<VendorApplication>(`admin/vendor-applications/${id}/trash`, { reason, note }),
  restore: (id: string, reason?: string) => api.patch<VendorApplication>(`admin/vendor-applications/${id}/restore`, { reason }),
  permanentlyDelete: (id: string, confirmation: "DELETE" | "PERMANENTLY DELETE") =>
    api.delete<{ applicationId: string; permanentlyDeleted: boolean }>(`admin/vendor-applications/${id}/permanent`, { body: { confirmation } })
};
