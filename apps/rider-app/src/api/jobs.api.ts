import { api } from "./client";

export type DeliveryStatus = "PICKED_UP" | "ON_THE_WAY" | "ARRIVED_DESTINATION" | "DELIVERED";
export type RiderRejectionReason = "TOO_FAR" | "VEHICLE_ISSUE" | "EMERGENCY" | "UNABLE_TO_CONTACT" | "OTHER";
export interface JobAddress { label?: string; addressLine?: string; city?: string; state?: string; deliveryNote?: string; }
export interface RiderJob {
  id: string;
  orderNumber: string;
  serviceCategory: string;
  orderStatus: string;
  paymentStatus: string;
  itemDescription?: string | null;
  customerNote?: string | null;
  deliveryFee: string | number;
  vendor?: { businessName: string; address?: string; city?: string; phoneNumber?: string } | null;
  pickupAddress?: JobAddress | null;
  deliveryAddress?: JobAddress | null;
  statusHistory?: Array<{ id: string; newStatus: string; note?: string | null; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export const jobsApi = {
  list: () => api.get<RiderJob[]>("rider/jobs"),
  detail: (id: string) => api.get<RiderJob>(`rider/jobs/${id}`),
  accept: (id: string) => api.post<RiderJob>(`rider/jobs/${id}/accept`),
  reject: (id: string, reason: RiderRejectionReason, details?: string) => api.post<RiderJob & { reassignmentRequired: boolean }>(`rider/jobs/${id}/reject`, { reason, details }),
  status: (id: string, status: DeliveryStatus) => api.post<RiderJob>(`rider/jobs/${id}/status`, { status }),
  complete: (id: string, deliveryOtp: string) => api.post<RiderJob>(`rider/jobs/${id}/complete`, { deliveryOtp })
};
