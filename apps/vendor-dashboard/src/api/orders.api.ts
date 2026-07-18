import { api } from "./client";
export type VendorAction = "accept" | "reject" | "preparing" | "ready";
export type RejectionReason = "ITEM_UNAVAILABLE" | "VENDOR_CLOSED" | "PRICE_ERROR" | "TOO_BUSY" | "OUT_OF_DELIVERY_WINDOW" | "OTHER";
export interface VendorOrderSummary { id: string; orderNumber: string; customerName: string; serviceCategory: string; orderStatus: string; paymentStatus: string; paymentMethod?: string | null; cashCollectionStatus?: string | null; cashCollectedAmount?: string | number | null; cashCollectedAt?: string | null; totalAmount: string | number; deliveryAddress?: string | null; createdAt: string; itemsCount: number; availableActions: VendorAction[]; }
export interface VendorOrderDetail extends Omit<VendorOrderSummary, "customerName" | "itemsCount" | "deliveryAddress"> { subtotal: string | number; deliveryFee: string | number; customer: { name: string; phoneNumber: string }; deliveryAddress?: { label: string; addressLine: string; city: string; state: string; deliveryNote?: string | null } | null; items: Array<{ id: string; productName: string; unitPrice: string | number; quantity: number; totalPrice: string | number; specialInstruction?: string | null }>; statusHistory: Array<{ id: string; newStatus: string; note?: string | null; createdAt: string }>; availableActions: VendorAction[]; }
export const ordersApi = {
  list: (status?: string) => api.get<VendorOrderSummary[]>(`vendor-dashboard/orders${status ? `?status=${status}` : ""}`),
  detail: (id: string) => api.get<VendorOrderDetail>(`vendor-dashboard/orders/${id}`),
  accept: (id: string) => api.post<VendorOrderDetail>(`vendor-dashboard/orders/${id}/accept`),
  preparing: (id: string) => api.post<VendorOrderDetail>(`vendor-dashboard/orders/${id}/preparing`),
  ready: (id: string) => api.post<VendorOrderDetail>(`vendor-dashboard/orders/${id}/ready`),
  reject: (id: string, reason: RejectionReason, details?: string) => api.post<VendorOrderDetail>(`vendor-dashboard/orders/${id}/reject`, { reason, details })
};
