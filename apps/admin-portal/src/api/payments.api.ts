import { api } from "./client";

export type PaymentReadinessStatus = "READY" | "WAITING_FOR_CONFIGURATION" | "BLOCKED";

export interface PaymentProviderRequirement {
  name: string;
  required: boolean;
  configured: boolean;
  purpose: string;
  issue?: string;
}

export interface PaymentProviderReadinessItem {
  provider: string;
  status: PaymentReadinessStatus;
  activeByEnvironment: boolean;
  customerSelectableInStaging: boolean;
  launchStatus?: string;
  launchNote?: string;
  readyForSandboxCheckout: boolean;
  readyForLiveCheckout: boolean;
  requirements: PaymentProviderRequirement[];
  issues: string[];
  recommendations?: string[];
  recommendedActions?: string[];
}

export interface PaymentProviderReadiness {
  activeProvider: string;
  legacyActiveProvider: string;
  paymentsLiveEnabled: boolean;
  customerSelectableSandboxProviders: string[];
  providerEnabledFlags: Record<string, string>;
  launchPaymentOptions?: {
    cashOnDelivery: {
      enabled: boolean;
      label: string;
      launchCities: string[];
      customerSelectable: boolean;
      requiresReconciliation: boolean;
      adminReconciliationAvailable: boolean;
      captainCashCollectionConfirmationAvailable: boolean;
      vendorVisibilityAvailable: boolean;
      envFlag: string;
      recommendedValue: string;
      note: string;
    };
    flutterwaveCustomerCheckout?: {
      enabled: boolean;
      label: string;
      customerSelectable: boolean;
      apiMode?: string;
      apiModeLabel?: string;
      v3SecretConfigured?: boolean;
      v3StandardCheckoutReady?: boolean;
      v4CredentialsConfigured?: boolean;
      accessTokenAuthReady?: boolean;
      v4EndpointConfigured?: boolean;
      v4CheckoutPath?: string;
      liveModeConfigured?: boolean;
      webhookConfigured?: boolean;
      callbackConfigured?: boolean;
      envFlag: string;
      recommendedValue: string;
      note: string;
    };
    squadCustomerCheckout: {
      enabled: boolean;
      label: string;
      customerSelectable: boolean;
      envFlag: string;
      recommendedValue: string;
      note: string;
    };
    wallet: {
      walletTopUpEnabled: boolean;
      walletTopUpConfiguredByEnv?: boolean;
      walletPaymentsEnabled: boolean;
      providerForTopUp: string;
      backendVerificationRequired: boolean;
      clientSideCreditDisabled: boolean;
      adminWalletVisibilityAvailable: boolean;
      minimumTopUpAmount: number;
      envFlags: string[];
      recommendedValues: Record<string, string>;
      note: string;
    };
  };
  webhookRoutes: Record<string, string>;
  providers: PaymentProviderReadinessItem[];
  liveActivation: {
    supportedByCurrentCode: boolean;
    status: PaymentReadinessStatus | string;
    blockers: string[];
  };
}

export type SandboxInitializationTestProvider = "paystack" | "monnify" | "squad";

export interface PaymentProviderInitializationTestResult {
  success: boolean;
  provider: SandboxInitializationTestProvider | string;
  mode: string;
  stage: string;
  transactionReference: string;
  authorizationUrlPresent?: boolean;
  accessCodePresent?: boolean;
  httpStatusCode?: number;
  providerMessage?: string;
  message?: string;
  timestamp: string;
}

export const paymentsApi = {
  approveRefund: (id: string) => api.post(`admin/payments/${id}/approve-refund`),
  providerReadiness: () => api.get<PaymentProviderReadiness>("admin/payments/provider-readiness"),
  testProviderReadiness: (provider: SandboxInitializationTestProvider) =>
    api.post<PaymentProviderInitializationTestResult>("admin/payments/provider-readiness/test", { provider })
};
