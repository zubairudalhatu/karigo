export const partnerOrderActions = ["accept", "reject", "preparing", "ready"] as const;
export type PartnerOrderAction = typeof partnerOrderActions[number];
export const partnerOrderRejectionReasons = ["ITEM_UNAVAILABLE", "VENDOR_CLOSED", "PRICE_ERROR", "TOO_BUSY", "OUT_OF_DELIVERY_WINDOW", "OTHER"] as const;
export type PartnerOrderRejectionReason = typeof partnerOrderRejectionReasons[number];
export interface PartnerOrderVersion { expectedStatus: string; expectedUpdatedAt: string; }
export interface PartnerOrderSummaryContract {
  id: string; orderNumber: string; customerName: string; serviceCategory: string;
  orderStatus: string; paymentStatus: string; paymentMethod?: string | null;
  cashCollectionStatus?: string; totalAmount: string | number;
  createdAt: string; updatedAt: string; itemsCount: number; availableActions: PartnerOrderAction[];
}
export interface PartnerOrderDetailContract extends Omit<PartnerOrderSummaryContract, "customerName" | "itemsCount"> {
  subtotal: string | number; deliveryFee: string | number; serviceFee: string | number; discountAmount: string | number;
  fulfilment: "COURIER_PICKUP"; customerNote: string | null;
  customer: { name: string; phoneNumber: string };
  deliveryAddress: { label: string; addressLine: string; city: string; state: string; deliveryNote: null } | null;
  items: Array<{ id: string; productName: string; unitPrice: string | number; quantity: number; totalPrice: string | number; specialInstruction: string | null }>;
  statusHistory: Array<{ id: string; previousStatus: string | null; newStatus: string; changedByRole: string; note: string | null; createdAt: string }>;
  rejectionReasons: PartnerOrderRejectionReason[];
  refundReviewRequired?: boolean;
}
