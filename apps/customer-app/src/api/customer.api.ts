import { api } from "./client";

export interface CustomerProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
}

export interface RetentionSummary {
  totalOrders: number;
  completedOrders: number;
  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  promoUsageCount: number;
  isRepeatCustomer: boolean;
}

export const customerApi = {
  profile: () => api.get<CustomerProfile>("customers/me"),
  update: (body: { fullName?: string; email?: string }) => api.patch<CustomerProfile>("customers/me", body),
  retention: () => api.get<RetentionSummary>("customers/me/retention-summary")
};
