export const customerTestPaymentProviders = ["mock", "paystack", "monnify", "squad", "flutterwave"] as const;
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
  flutterwaveCustomerCheckoutEnabled?: boolean;
  flutterwaveReady?: boolean;
  squadCustomerCheckoutEnabled?: boolean;
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
  utilitiesEnabled?: boolean;
  utilitiesCustomerPurchaseEnabled?: boolean;
  utilitiesProvider?: string;
  utilitiesProviderLabel?: string;
  utilitiesTestMode?: boolean;
  utilitiesStatusNote?: string;
  launchCities?: string[];
}

export interface PaymentAuthorization {
  paymentId: string;
  transactionReference: string;
  reference?: string;
  amount?: number;
  currency?: string;
  authorizationUrl?: string;
  checkoutUrl?: string;
  paymentUrl?: string;
  url?: string;
  provider: string;
}
