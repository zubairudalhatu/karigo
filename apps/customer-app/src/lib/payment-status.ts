import type { CustomerTestPaymentProvider, PublicPaymentConfig } from "@karigo/shared-types";

export type PaymentStatusView = {
  title: string;
  body: string;
  actionHint: string;
};

const productionPaymentLaunchMode =
  process.env.APP_VARIANT === "production" ||
  process.env.EAS_BUILD_PROFILE === "customer-production";
const squadLiveLaunchMode = process.env.EXPO_PUBLIC_PAYMENT_LAUNCH_MODE === "squad_live" || productionPaymentLaunchMode;

const paymentProviderLabels: Record<CustomerTestPaymentProvider, string> = {
  mock: "Mock Payment",
  paystack: "Paystack Test Mode",
  monnify: "Monnify Sandbox",
  squad: squadLiveLaunchMode ? "Squad by GTBank" : "Squad Sandbox"
};
const squadSandboxCheckoutEnabled = process.env.EXPO_PUBLIC_SQUAD_SANDBOX_CHECKOUT_ENABLED === "true";

export type CustomerPaymentProviderOption = {
  value: CustomerTestPaymentProvider;
  title: string;
  description: string;
};

const stagingPaymentProviderOptions: CustomerPaymentProviderOption[] = [
  {
    value: "mock",
    title: "Mock Payment",
    description: "Instant staging fallback for internal testing only."
  },
  ...(squadSandboxCheckoutEnabled ? [{
    value: "squad" as CustomerTestPaymentProvider,
    title: "Squad Sandbox",
    description: "Opens a Squad sandbox checkout page only when Squad sandbox credentials and payload are confirmed."
  }] : []),
  {
    value: "monnify",
    title: "Monnify Sandbox",
    description: "Pending provider approval; remains available only for controlled sandbox tests when configured."
  },
  {
    value: "paystack",
    title: "Paystack Test Mode",
    description: "Pending provider approval; remains available only for controlled test-mode checks when configured."
  }
];

const squadLivePaymentProviderOptions: CustomerPaymentProviderOption[] = [
  {
    value: "squad",
    title: "Squad by GTBank",
    description: "Squad by GTBank is KariGO's approved launch payment provider."
  }
];

export const fallbackCustomerPaymentConfig: PublicPaymentConfig = squadLiveLaunchMode
  ? {
      livePaymentsEnabled: true,
      activeProvider: "squad",
      customerSelectableProviders: ["squad"],
      launchProviderLabel: "Squad by GTBank",
      mockPaymentVisible: false,
      squadReady: true,
      monnifyVisible: false,
      paystackVisible: false
    }
  : {
      livePaymentsEnabled: false,
      activeProvider: "mock",
      customerSelectableProviders: stagingPaymentProviderOptions.map((option) => option.value),
      launchProviderLabel: "Staging payment providers",
      mockPaymentVisible: true,
      squadReady: squadSandboxCheckoutEnabled,
      monnifyVisible: true,
      paystackVisible: true
    };

export function isSquadLivePaymentConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): boolean {
  return (
    config.livePaymentsEnabled &&
    config.activeProvider === "squad" &&
    config.customerSelectableProviders.length === 1 &&
    config.customerSelectableProviders[0] === "squad"
  );
}

export function customerPaymentProviderOptions(
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): CustomerPaymentProviderOption[] {
  if (isSquadLivePaymentConfig(config)) {
    return squadLivePaymentProviderOptions;
  }
  return stagingPaymentProviderOptions.filter((option) => config.customerSelectableProviders.includes(option.value));
}

export const customerTestPaymentProviderOptions: CustomerPaymentProviderOption[] = squadLiveLaunchMode
  ? [{
      value: "squad",
      title: "Squad by GTBank",
      description: "Primary launch checkout provider. KariGO confirms payment only after backend verification."
    }]
  : stagingPaymentProviderOptions;

export const defaultCustomerPaymentProvider: CustomerTestPaymentProvider = customerTestPaymentProviderOptions[0]?.value ?? "mock";

export function defaultCustomerPaymentProviderForConfig(
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): CustomerTestPaymentProvider {
  return customerPaymentProviderOptions(config)[0]?.value ?? "mock";
}

export function paymentProviderLabel(provider?: string | null, config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (provider === "squad" && isSquadLivePaymentConfig(config)) return "Squad by GTBank";
  if (provider && provider in paymentProviderLabels) {
    return paymentProviderLabels[provider as CustomerTestPaymentProvider];
  }
  return "Sandbox payment";
}

export function paymentSafetyNoteForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  return isSquadLivePaymentConfig(config)
    ? "Squad by GTBank is KariGO's approved launch payment provider. KariGO verifies payment server-side before marking an order paid. Wallet funding, automatic refunds and payout automation remain disabled."
    : "Mock Payment is for staging fallback. Squad Sandbox is hidden unless explicitly enabled; Monnify and Paystack remain pending approval and are for controlled sandbox/test checks only. Live payments, wallet funding, automatic refunds and payout automation remain disabled.";
}

export const paymentSafetyNote = paymentSafetyNoteForConfig();

export function paymentProviderSelectionTitleForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  return isSquadLivePaymentConfig(config) ? "Payment provider" : "Test payment provider";
}

export const paymentProviderSelectionTitle = paymentProviderSelectionTitleForConfig();

export function paymentProviderSelectionBodyForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  return isSquadLivePaymentConfig(config)
    ? "Pay securely using KariGO's approved payment provider."
    : "Choose how to verify this staging checkout. Mock payment remains the safe pilot fallback.";
}

export const paymentProviderSelectionBody = paymentProviderSelectionBodyForConfig();

export function paymentProviderSensitiveDataNoteForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  return isSquadLivePaymentConfig(config)
    ? "Use only your own approved payment details. KariGO will not mark the order paid until backend verification succeeds."
    : "Do not use live card, bank or account details during sandbox tests.";
}

export const paymentProviderSensitiveDataNote = paymentProviderSensitiveDataNoteForConfig();

export const walletRefundFutureNote =
  "KariGO Wallet refunds and wallet-to-utility payments are future workflows. Refunds remain admin-reviewed until separately approved.";

export function paymentStatusView(status?: string): PaymentStatusView {
  switch (status) {
    case "SUCCESSFUL":
      return {
        title: "Payment successful",
        body: "KariGO has verified this payment. The order can continue to vendor and dispatch processing.",
        actionHint: "No further payment action is needed."
      };
    case "FAILED":
      return {
        title: "Payment failed",
        body: "The payment was not completed or could not be verified. You can retry payment safely.",
        actionHint: "Retry payment when you are ready."
      };
    case "REFUND_PENDING":
      return {
        title: "Refund under review",
        body: "Your refund request is waiting for KariGO admin review.",
        actionHint: "No automatic wallet refund is active yet."
      };
    case "REFUNDED":
      return {
        title: "Refund recorded",
        body: "KariGO has recorded this payment as refunded internally.",
        actionHint: "Provider-side reconciliation remains an operations process."
      };
    case "PENDING":
    default:
      return {
        title: "Awaiting payment",
        body: "Complete payment before the order moves to the vendor and dispatch workflow.",
        actionHint: squadLiveLaunchMode ? "Continue with Squad by GTBank when you are ready." : "Use mock payment or an approved sandbox payment provider only."
      };
  }
}

export function paymentStatusViewForConfig(
  status?: string,
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): PaymentStatusView {
  const view = paymentStatusView(status);
  if (status === "PENDING" || !status) {
    return {
      ...view,
      actionHint: isSquadLivePaymentConfig(config)
        ? "Continue with Squad by GTBank when you are ready."
        : "Use mock payment or an approved sandbox payment provider only."
    };
  }
  return view;
}

export function pendingAuthorizationCopy(providerLabel = "Sandbox payment"): PaymentStatusView {
  return {
    title: `${providerLabel} authorization`,
    body: `Complete the ${providerLabel} checkout page, return to KariGO, then verify payment here.`,
    actionHint: "KariGO will only mark the order paid after backend verification."
  };
}

export function paymentAuthorizationOpenedMessage(
  providerLabel: string,
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): string {
  const checkoutType = isSquadLivePaymentConfig(config) ? "payment checkout" : "sandbox checkout";
  return `${providerLabel} opened. Return to KariGO and tap Verify payment after completing the ${checkoutType}.`;
}

export function paymentVerificationFailureMessage(message: string): string {
  return `Payment could not be verified yet. ${message} If you cancelled or did not complete checkout, reopen the payment page and try again.`;
}

export function paymentInitializationFailureMessage(
  providerLabel: string,
  message: string,
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): string {
  const normalizedMessage = message.trim();
  const isLiveSquad = isSquadLivePaymentConfig(config);
  const defaultFailure = isLiveSquad
    ? "The payment provider could not be started safely."
    : "The sandbox provider could not be started safely.";
  const safeMessage = /^internal server error$/i.test(normalizedMessage)
    ? defaultFailure
    : normalizedMessage || defaultFailure;
  const fallback = isLiveSquad
    ? "Please try again or contact KariGO support."
    : "You can select Mock payment to continue staging checkout while provider configuration is reviewed.";
  return isLiveSquad
    ? `Squad payment could not be started. ${fallback}`
    : `${providerLabel} could not be started. ${safeMessage} ${fallback}`;
}
