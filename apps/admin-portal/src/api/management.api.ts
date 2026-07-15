import { api } from "./client";

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
  payments: { provider: string; liveEnabled: boolean; mockFallbackAvailable: boolean; livePaymentCollectionDisabled: boolean; sandboxProviders: Record<string, boolean> };
  utilities: { accelerateConfigured: boolean; liveUtilityFulfilmentEnabled: boolean };
  notifications: { termiiConfigured: boolean; resendConfigured: boolean; marketingEnabled: boolean; bulkMessagingEnabled: boolean };
  biometricReadiness: { credentialStorageModelReady: boolean; passwordlessLoginEnabled: boolean; note: string };
}

export const managementApi = {
  users: () => api.get<any[]>("admin/users"),
  vendors: () => api.get<AdminVendor[]>("admin/vendors"),
  trashedVendors: () => api.get<AdminVendor[]>("admin/vendors/trash"),
  trashVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/trash`, { reason }),
  restoreVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/restore`, { reason }),
  permanentlyDeleteVendor: (vendorId: string) => api.delete<{ vendorId: string; permanentlyDeleted: boolean }>(`admin/vendors/${vendorId}`),
  createVendorActivationLink: (vendorId: string) => api.post<{ activationUrl: string; expiresAt: string; tokenVisibleOnce: boolean; deliveryWarning: string }>(`admin/vendors/${vendorId}/activation-link`),
  riders: () => api.get<any[]>("admin/riders"),
  auditLogs: () => api.get<AdminAuditLog[]>("admin/audit-logs"),
  loginActivity: () => api.get<LoginActivity[]>("admin/login-activity"),
  integrationSettings: () => api.get<IntegrationSettings>("admin/settings/integration-modes")
};
