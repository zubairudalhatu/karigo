import type { OrderStatus, ServiceCategory } from "./index";

export interface OrderItemInput {
  productId: string;
  quantity: number;
  specialInstruction?: string;
}

export interface CreateOrderRequest {
  vendorId: string;
  deliveryAddressId: string;
  serviceCategory: ServiceCategory;
  items: OrderItemInput[];
  customerNote?: string;
  promoCode?: string;
  paymentMethod?: "FLUTTERWAVE" | "SQUAD" | "WALLET" | "CASH_ON_DELIVERY" | "flutterwave" | "squad" | "wallet" | "cash_on_delivery";
}

export type QuoteOrderRequest = CreateOrderRequest;

export interface CheckoutQuote {
  quoteReference: string;
  cartSubtotal: number;
  deliveryFee: number;
  discountAmount: number;
  finalPayableAmount: number;
  promoCode?: string;
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  serviceCategory: ServiceCategory;
  orderStatus: OrderStatus;
  paymentStatus: string;
  paymentMethod?: string | null;
  cashCollectionStatus?: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  totalAmount: number;
  createdAt: string;
}
