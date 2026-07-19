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
      customerSelectableProviders: [],
      launchProviderLabel: "Squad by GTBank",
      mockPaymentVisible: false,
      squadCustomerCheckoutEnabled: false,
      squadReady: false,
      monnifyVisible: false,
      paystackVisible: false,
      cashPaymentEnabled: true,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Pay on Delivery is available for supported KariGO orders.",
      launchCities: ["Kano", "Abuja"],
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletTopUpProvider: "squad",
      walletTopUpProviderLabel: "Squad by GTBank",
      walletMinimumTopUpAmount: 100
    }
  : {
      livePaymentsEnabled: false,
      activeProvider: "mock",
      customerSelectableProviders: stagingPaymentProviderOptions.map((option) => option.value),
      launchProviderLabel: "Staging payment providers",
      mockPaymentVisible: true,
      squadCustomerCheckoutEnabled: false,
      squadReady: squadSandboxCheckoutEnabled,
      monnifyVisible: true,
      paystackVisible: true,
      cashPaymentEnabled: true,
      cashPaymentLabel: "Pay on Delivery",
      cashPaymentNote: "Pay on Delivery is available for supported KariGO orders.",
      launchCities: ["Kano", "Abuja"],
      walletTopUpEnabled: false,
      walletPaymentsEnabled: false,
      walletTopUpProvider: "squad",
      walletTopUpProviderLabel: "Squad by GTBank",
      walletMinimumTopUpAmount: 100
    };

export function isSquadLivePaymentConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): boolean {
  return (
    config.livePaymentsEnabled &&
    config.activeProvider === "squad" &&
    config.squadCustomerCheckoutEnabled === true &&
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
  ? []
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
  if (config.livePaymentsEnabled && !config.squadCustomerCheckoutEnabled) {
    return "Customer checkout is currently Pay on Delivery only while electronic checkout is under live review.";
  }
  return isSquadLivePaymentConfig(config)
    ? "Squad by GTBank is KariGO's approved launch payment provider. KariGO verifies payment server-side before marking an order paid. Wallet top-up is controlled by backend config; wallet order payment, automatic refunds and payout automation remain disabled until separately approved."
    : "Mock Payment is for staging fallback. Squad Sandbox is hidden unless explicitly enabled; Monnify and Paystack remain pending approval and are for controlled sandbox/test checks only. Wallet top-up is controlled by backend config; wallet order payment, automatic refunds and payout automation remain disabled until separately approved.";
}

export const paymentSafetyNote = paymentSafetyNoteForConfig();

export function paymentProviderSelectionTitleForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (config.livePaymentsEnabled && !config.squadCustomerCheckoutEnabled) return "Electronic payment unavailable";
  return isSquadLivePaymentConfig(config) ? "Payment provider" : "Test payment provider";
}

export const paymentProviderSelectionTitle = paymentProviderSelectionTitleForConfig();

export function paymentProviderSelectionBodyForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (config.livePaymentsEnabled && !config.squadCustomerCheckoutEnabled) {
    return "Pay on Delivery is the active customer checkout method while electronic payment is under review.";
  }
  return isSquadLivePaymentConfig(config)
    ? "Pay securely using KariGO's approved payment provider."
    : "Choose how to verify this staging checkout. Mock payment remains the safe pilot fallback.";
}

export const paymentProviderSelectionBody = paymentProviderSelectionBodyForConfig();

export function paymentProviderSensitiveDataNoteForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (config.livePaymentsEnabled && !config.squadCustomerCheckoutEnabled) {
    return "Do not enter card or bank details in KariGO while electronic payment is disabled.";
  }
  return isSquadLivePaymentConfig(config)
    ? "Use only your own approved payment details. KariGO will not mark the order paid until backend verification succeeds."
    : "Do not use live card, bank or account details during sandbox tests.";
}

export const paymentProviderSensitiveDataNote = paymentProviderSensitiveDataNoteForConfig();

export const walletRefundFutureNote =
  "KariGO Wallet refunds and wallet-to-utility payments remain approval-controlled. Refunds stay admin-reviewed until separately approved.";

export function paymentStatusView(status?: string): PaymentStatusView {
  switch (status) {
    case "CASH_PENDING":
      return {
        title: "Pay on Delivery",
        body: "This order is marked for cash collection at delivery. It is not electronically paid.",
        actionHint: "Please pay only the amount shown in KariGO to the assigned Captain/vendor."
      };
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
        : config.livePaymentsEnabled && !config.squadCustomerCheckoutEnabled
          ? "Pay on Delivery is active for new supported KariGO orders."
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
    ? `Squad payment could not be started. ${safeMessage} ${fallback}`
    : `${providerLabel} could not be started. ${safeMessage} ${fallback}`;
}
