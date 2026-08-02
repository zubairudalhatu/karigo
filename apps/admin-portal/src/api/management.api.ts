import { api } from "./client";
import { requireCollection } from "../lib/collections";

export interface VendorCleanupSafety {
  canPermanentlyDelete: boolean;
  blockedBy: string[];
  protectedRecordCounts: {
    orders: number;
    settlements: number;
    promoCodes: number;
    payoutAccounts: number;
    orderItems: number;
  };
  removableCatalogRecords: { products: number };
}

export interface VendorTrashSafety {
  canMoveToTrash: boolean;
  blockedBy: string[];
  recordCounts: {
    activeOrders: number;
    products: number;
  };
}

export interface AdminVendor {
  id: string;
  businessName: string;
  businessCategory: string;
  city: string;
  state: string;
  status: string;
  isOpen: boolean;
  totalOrders: number;
  deletedAt?: string | null;
  inTrash: boolean;
  user: { accountStatus: string; deletedAt?: string | null };
  cleanupSafety?: VendorCleanupSafety;
  trashSafety?: VendorTrashSafety;
  onboardingDocuments?: VendorOnboardingDocument[];
}

export interface AdminUserSummary {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: string;
  adminRole?: string | null;
  accountStatus: string;
  createdAt: string;
}

export interface AdminRiderSummary {
  id: string;
  riderCode: string;
  phoneNumber: string;
  vehicleType?: string | null;
  availabilityStatus: string;
  verificationStatus: string;
  currentLatitude?: string | null;
  currentLongitude?: string | null;
  currentLocationUpdatedAt?: string | null;
  user: { id: string; fullName: string; accountStatus: string; phoneVerified?: boolean; passwordCreated?: boolean; loginReady?: boolean };
  deliveryApplication?: { id: string; applicationReference: string; status: string; createdAt: string; updatedAt: string } | null;
  rideApplication?: { id: string; applicationReference: string; status: string; createdAt: string; updatedAt: string } | null;
  rideProfile?: { id: string; applicationId?: string | null; status: string; isAvailableForTaxi: boolean; updatedAt: string } | null;
  workState?: {
    desiredDeliveryOnline: boolean;
    desiredRideOnline: boolean;
    effectiveDeliveryOnline: boolean;
    effectiveRideOnline: boolean;
    activeWorkMode?: "DELIVERY" | "RIDE" | null;
    activeWorkReference?: string | null;
    lockStage?: string | null;
    lockedAt?: string | null;
    lastAvailabilityChangeAt?: string | null;
    lastLocationAt?: string | null;
    deliveryEligibility?: { eligible: boolean; reasonCode?: string; reason?: string | null };
    rideEligibility?: { eligible: boolean; reasonCode?: string; reason?: string | null };
  } | null;
  operationalModes?: string[];
}

export interface VendorOnboardingDocument {
  id: string;
  documentType: string;
  documentName?: string | null;
  documentUrl: string;
  verificationStatus: string;
  adminNote?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValue?: unknown;
  createdAt: string;
  adminUser?: { fullName: string; adminRole?: string | null } | null;
}

export interface LoginActivity {
  id: string;
  phoneNumberMasked?: string | null;
  role?: string | null;
  outcome: string;
  reason?: string | null;
  createdAt: string;
  user?: { fullName: string; role: string; adminRole?: string | null } | null;
}

export interface IntegrationSettings {
  environment: string;
  payments: {
    provider: string;
    liveEnabled: boolean;
    mockFallbackAvailable: boolean;
    livePaymentCollectionDisabled: boolean;
    sandboxProviders: Record<string, boolean>;
    wallet?: {
      walletTopUpEnabled: boolean;
      walletPaymentsEnabled: boolean;
      providerForTopUp: string;
      backendVerificationRequired: boolean;
      clientSideCreditDisabled: boolean;
      minimumTopUpAmount: number;
      note: string;
    };
  };
  utilities: { accelerateConfigured: boolean; liveUtilityFulfilmentEnabled: boolean };
  notifications: { termiiConfigured: boolean; resendConfigured: boolean; marketingEnabled: boolean; bulkMessagingEnabled: boolean };
  biometricReadiness: { credentialStorageModelReady: boolean; passwordlessLoginEnabled: boolean; note: string };
}

export interface VendorActivationLinkResult {
  vendorId: string;
  businessName: string;
  expiresAt: string;
  tokenVisibleOnce: boolean;
  notificationQueued: boolean;
  deliveryWarning: string;
}

export const managementApi = {
  users: async () => requireCollection<AdminUserSummary>(await api.get<unknown>("admin/users"), "users"),
  vendors: async () => requireCollection<AdminVendor>(await api.get<unknown>("admin/vendors"), "vendors"),
  trashedVendors: async () => requireCollection<AdminVendor>(await api.get<unknown>("admin/vendors/trash"), "trashed vendors"),
  trashVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/trash`, { reason }),
  restoreVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/restore`, { reason }),
  permanentlyDeleteVendor: (vendorId: string, confirmation: "DELETE" | "PERMANENTLY DELETE") =>
    api.delete<{ vendorId: string; permanentlyDeleted: boolean }>(`admin/vendors/${vendorId}`, { body: { confirmation } }),
  createVendorActivationLink: (vendorId: string) => api.post<VendorActivationLinkResult>(`admin/vendors/${vendorId}/activation-link`),
  updateVendorStatus: (vendorId: string, status: string, note?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/status`, { status, note }),
  updateVendorLifecycle: (vendorId: string, action: "SUSPEND" | "REACTIVATE", reason: string) =>
    api.patch<AdminVendor>(`admin/vendors/${vendorId}/lifecycle`, { action, reason }),
  vendorOnboardingDocuments: (vendorId: string) => api.get<VendorOnboardingDocument[]>(`admin/vendors/${vendorId}/onboarding-documents`),
  reviewVendorOnboardingDocument: (vendorId: string, documentId: string, status: string, adminNote?: string) =>
    api.patch<VendorOnboardingDocument>(`admin/vendors/${vendorId}/onboarding-documents/${documentId}/review`, { status, adminNote }),
  riders: () => api.get<AdminRiderSummary[]>("admin/riders"),
  updateRiderLifecycle: (riderId: string, action: "ACTIVATE" | "SUSPEND" | "REACTIVATE", reason: string) =>
    api.patch<AdminRiderSummary>(`admin/riders/${riderId}/lifecycle`, { action, reason }),
  updateCustomerLifecycle: (userId: string, action: "SUSPEND" | "REACTIVATE", reason: string) =>
    api.patch<AdminUserSummary>(`admin/users/${userId}/lifecycle`, { action, reason }),
  auditLogs: () => api.get<AdminAuditLog[]>("admin/audit-logs"),
  loginActivity: () => api.get<LoginActivity[]>("admin/login-activity"),
  integrationSettings: () => api.get<IntegrationSettings>("admin/settings/integration-modes")
};
