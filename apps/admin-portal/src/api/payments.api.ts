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
