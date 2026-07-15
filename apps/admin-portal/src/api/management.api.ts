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

export const managementApi = {
  users: () => api.get<any[]>("admin/users"),
  vendors: () => api.get<AdminVendor[]>("admin/vendors"),
  trashedVendors: () => api.get<AdminVendor[]>("admin/vendors/trash"),
  trashVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/trash`, { reason }),
  restoreVendor: (vendorId: string, reason?: string) => api.patch<AdminVendor>(`admin/vendors/${vendorId}/restore`, { reason }),
  permanentlyDeleteVendor: (vendorId: string) => api.delete<{ vendorId: string; permanentlyDeleted: boolean }>(`admin/vendors/${vendorId}`),
  riders: () => api.get<any[]>("admin/riders")
};
