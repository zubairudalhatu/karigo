import type { CheckoutQuote, CreateOrderRequest, QuoteOrderRequest } from "@karigo/shared-types";
import { api } from "./client";

export interface Order {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  serviceCategory: string;
  subtotal: number | string;
  deliveryFee: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  vendor?: { businessName: string } | null;
  items: Array<{ id: string; productName: string; quantity: number; unitPrice: number | string; totalPrice: number | string }>;
  statusHistory: Array<{ id: string; newStatus: string; note?: string | null; createdAt: string }>;
}

export interface ParcelRequest {
  pickupAddressId: string;
  deliveryAddressId: string;
  recipientName: string;
  recipientPhone: string;
  itemDescription: string;
  customerNote?: string;
}

export const ordersApi = {
  quote: (body: QuoteOrderRequest) => api.post<CheckoutQuote>("orders/quote", body),
  create: (body: CreateOrderRequest) => api.post<Order>("orders", body),
  createParcel: (body: ParcelRequest) => api.post<Order>("orders/parcel", body),
  mine: () => api.get<Order[]>("orders/my-orders"),
  detail: (id: string) => api.get<Order>(`orders/${id}`),
  tracking: (id: string) => api.get<Pick<Order, "id" | "orderNumber" | "orderStatus" | "paymentStatus" | "statusHistory">>(`orders/${id}/tracking`)
};
