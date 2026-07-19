export const customerTestPaymentProviders = ["mock", "paystack", "monnify", "squad"] as const;
export type CustomerTestPaymentProvider = (typeof customerTestPaymentProviders)[number];

export interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  paymentProvider?: CustomerTestPaymentProvider;
}

export interface PublicPaymentConfig {
  livePaymentsEnabled: boolean;
  activeProvider: string;
  customerSelectableProviders: CustomerTestPaymentProvider[];
  launchProviderLabel: string;
  mockPaymentVisible: boolean;
  squadReady: boolean;
  monnifyVisible: boolean;
  paystackVisible: boolean;
  cashPaymentEnabled?: boolean;
  cashPaymentLabel?: string;
  cashPaymentNote?: string;
  walletTopUpEnabled?: boolean;
  walletPaymentsEnabled?: boolean;
  walletTopUpProvider?: string;
  walletTopUpProviderLabel?: string;
  walletMinimumTopUpAmount?: number;
  walletPaymentNote?: string;
  launchCities?: string[];
}

export interface PaymentAuthorization {
  paymentId: string;
  transactionReference: string;
  authorizationUrl?: string;
  checkoutUrl?: string;
  paymentUrl?: string;
  url?: string;
  provider: string;
}
