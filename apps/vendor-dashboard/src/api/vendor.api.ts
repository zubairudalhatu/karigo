import { api } from "./client";
export interface VendorProfile { id: string; businessName: string; description?: string | null; phoneNumber: string; email?: string | null; address: string; city: string; state: string; status: string; isOpen: boolean; openingTime?: string | null; closingTime?: string | null; }
export const vendorApi = { profile: () => api.get<VendorProfile>("vendors/me"), update: (body: Partial<VendorProfile>) => api.patch<VendorProfile>("vendors/me", body) };
