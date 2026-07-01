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
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  serviceCategory: ServiceCategory;
  orderStatus: OrderStatus;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  totalAmount: number;
  createdAt: string;
}
