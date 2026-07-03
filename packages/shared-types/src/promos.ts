import type { ServiceCategory } from "./index";

export interface ValidatePromoRequest {
  promoCode: string;
  orderId?: string;
  vendorId?: string;
  serviceCategory?: ServiceCategory;
  subtotal: number;
  deliveryFee?: number;
}

export interface PromoValidationResult {
  promoCodeId: string;
  code: string;
  deliveryFee: number;
  discountAmount: number;
  finalPayableAmount: number;
}
