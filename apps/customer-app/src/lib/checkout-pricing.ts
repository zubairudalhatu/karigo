export interface ServerPricingSource {
  subtotal?: number | string;
  deliveryFee?: number | string;
  discountAmount?: number | string;
  totalAmount?: number | string;
  finalPayableAmount?: number | string;
}

export interface PricingBreakdown {
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  payableAmount: number;
}

const toNumber = (value: number | string | undefined): number => Number(value ?? 0);

export function pricingFromServer(source: ServerPricingSource): PricingBreakdown {
  return {
    subtotal: toNumber(source.subtotal),
    deliveryFee: toNumber(source.deliveryFee),
    discountAmount: toNumber(source.discountAmount),
    payableAmount: toNumber(source.totalAmount ?? source.finalPayableAmount)
  };
}

export function emptyPricing(subtotal: number | string = 0): PricingBreakdown {
  return {
    subtotal: toNumber(subtotal),
    deliveryFee: 0,
    discountAmount: 0,
    payableAmount: toNumber(subtotal)
  };
}
