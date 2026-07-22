import type { CustomerTestPaymentProvider, PublicPaymentConfig } from "@karigo/shared-types";

export type PaymentStatusView = {
  title: string;
  body: string;
  actionHint: string;
};

const productionPaymentLaunchMode =
  process.env.APP_VARIANT === "production" ||
  process.env.EAS_BUILD_PROFILE === "customer-production";
const flutterwaveLiveLaunchMode =
  process.env.EXPO_PUBLIC_PAYMENT_LAUNCH_MODE === "flutterwave_live" ||
  productionPaymentLaunchMode;

const paymentProviderLabels: Record<CustomerTestPaymentProvider, string> = {
  mock: "Mock Payment",
  paystack: "Paystack Test Mode",
  monnify: "Monnify Sandbox",
  squad: "Squad Sandbox",
  flutterwave: "Flutterwave"
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
    description: "Deferred for customer checkout unless a separate Squad reopening task enables it."
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

const flutterwaveLivePaymentProviderOptions: CustomerPaymentProviderOption[] = [
  {
    value: "flutterwave",
    title: "Pay with Flutterwave",
    description: "Opens Flutterwave checkout securely outside KariGO. Payment is confirmed only after backend verification."
  }
];

export const fallbackCustomerPaymentConfig: PublicPaymentConfig = flutterwaveLiveLaunchMode
  ? {
      livePaymentsEnabled: true,
      activeProvider: "flutterwave",
      customerSelectableProviders: [],
      launchProviderLabel: "Flutterwave",
      mockPaymentVisible: false,
      flutterwaveCustomerCheckoutEnabled: false,
      flutterwaveReady: false,
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
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: 100,
      utilitiesEnabled: false,
      utilitiesCustomerPurchaseEnabled: false,
      utilitiesProvider: "mock",
      utilitiesProviderLabel: "Mock utility provider",
      utilitiesTestMode: true,
      utilitiesStatusNote: "Utilities are being activated. Please try again later or use test mode where available."
    }
  : {
      livePaymentsEnabled: false,
      activeProvider: "mock",
      customerSelectableProviders: stagingPaymentProviderOptions.map((option) => option.value),
      launchProviderLabel: "Staging payment providers",
      mockPaymentVisible: true,
      flutterwaveCustomerCheckoutEnabled: false,
      flutterwaveReady: false,
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
      walletTopUpProvider: "flutterwave",
      walletTopUpProviderLabel: "Flutterwave",
      walletMinimumTopUpAmount: 100,
      utilitiesEnabled: false,
      utilitiesCustomerPurchaseEnabled: false,
      utilitiesProvider: "mock",
      utilitiesProviderLabel: "Mock utility provider",
      utilitiesTestMode: true,
      utilitiesStatusNote: "Utilities are being activated. Please try again later or use test mode where available."
    };

export function isFlutterwaveLivePaymentConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): boolean {
  return (
    config.livePaymentsEnabled &&
    config.activeProvider === "flutterwave" &&
    config.flutterwaveCustomerCheckoutEnabled === true &&
    config.flutterwaveReady === true &&
    config.customerSelectableProviders.length === 1 &&
    config.customerSelectableProviders[0] === "flutterwave"
  );
}

export function customerPaymentProviderOptions(
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): CustomerPaymentProviderOption[] {
  if (isFlutterwaveLivePaymentConfig(config)) {
    return flutterwaveLivePaymentProviderOptions;
  }
  return stagingPaymentProviderOptions.filter((option) => config.customerSelectableProviders.includes(option.value));
}

export const customerTestPaymentProviderOptions: CustomerPaymentProviderOption[] = flutterwaveLiveLaunchMode
  ? []
  : stagingPaymentProviderOptions;

export const defaultCustomerPaymentProvider: CustomerTestPaymentProvider = customerTestPaymentProviderOptions[0]?.value ?? "mock";

export function defaultCustomerPaymentProviderForConfig(
  config: PublicPaymentConfig = fallbackCustomerPaymentConfig
): CustomerTestPaymentProvider {
  return customerPaymentProviderOptions(config)[0]?.value ?? "mock";
}

export function paymentProviderLabel(provider?: string | null, config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (provider === "flutterwave" && isFlutterwaveLivePaymentConfig(config)) return "Flutterwave";
  if (provider && provider in paymentProviderLabels) {
    return paymentProviderLabels[provider as CustomerTestPaymentProvider];
  }
  return "Payment provider";
}

export function paymentSafetyNoteForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (isFlutterwaveLivePaymentConfig(config)) {
    const walletTopUpCopy = config.walletTopUpEnabled
      ? "Wallet top-up is available through Flutterwave and credits only after backend verification."
      : "Wallet top-up remains disabled until separately approved.";
    return `Flutterwave is KariGO's approved online payment provider. KariGO verifies payment server-side before marking an order paid. ${walletTopUpCopy} Wallet order payment, automatic refunds and payout automation remain disabled until separately approved.`;
  }
  if (config.livePaymentsEnabled) {
    return "Pay on Delivery is available for supported KariGO orders while online payment is temporarily unavailable.";
  }
  return "Mock Payment is for staging fallback. Squad is deferred for customer checkout; Monnify and Paystack remain pending approval and are for controlled sandbox/test checks only. Wallet top-up is controlled by backend config; wallet order payment, automatic refunds and payout automation remain disabled until separately approved.";
}

export const paymentSafetyNote = paymentSafetyNoteForConfig();

export function paymentProviderSelectionTitleForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (isFlutterwaveLivePaymentConfig(config)) return "Payment provider";
  if (config.livePaymentsEnabled) return "Online payment unavailable";
  return "Test payment provider";
}

export const paymentProviderSelectionTitle = paymentProviderSelectionTitleForConfig();

export function paymentProviderSelectionBodyForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (isFlutterwaveLivePaymentConfig(config)) {
    return "Pay securely with Flutterwave or choose Pay on Delivery where supported.";
  }
  if (config.livePaymentsEnabled) {
    return "Pay on Delivery is the active customer checkout method right now.";
  }
  return "Choose how to verify this staging checkout. Mock payment remains the safe pilot fallback.";
}

export const paymentProviderSelectionBody = paymentProviderSelectionBodyForConfig();

export function paymentProviderSensitiveDataNoteForConfig(config: PublicPaymentConfig = fallbackCustomerPaymentConfig): string {
  if (isFlutterwaveLivePaymentConfig(config)) {
    return "Use only your own approved payment details. KariGO will not mark the order paid until backend verification succeeds.";
  }
  if (config.livePaymentsEnabled) {
    return "Do not enter card or bank details in KariGO while online payment is unavailable.";
  }
  return "Do not use live card, bank or account details during sandbox tests.";
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
        actionHint: flutterwaveLiveLaunchMode ? "Continue with Flutterwave when you are ready." : "Use mock payment or an approved sandbox payment provider only."
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
      actionHint: isFlutterwaveLivePaymentConfig(config)
        ? "Continue with Flutterwave when you are ready."
        : config.livePaymentsEnabled
          ? "Pay on Delivery is active for new supported KariGO orders."
          : "Use mock payment or an approved sandbox payment provider only."
    };
  }
  return view;
}

export function pendingAuthorizationCopy(providerLabel = "Payment provider"): PaymentStatusView {
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
  const checkoutType = isFlutterwaveLivePaymentConfig(config) ? "payment checkout" : "sandbox checkout";
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
  const isLiveFlutterwave = isFlutterwaveLivePaymentConfig(config);
  const defaultFailure = isLiveFlutterwave
    ? "The payment provider could not be started safely."
    : "The sandbox provider could not be started safely.";
  const safeMessage = /^internal server error$/i.test(normalizedMessage)
    ? defaultFailure
    : normalizedMessage || defaultFailure;
  const fallback = isLiveFlutterwave
    ? "Please use Pay on Delivery."
    : "You can select Mock payment to continue staging checkout while provider configuration is reviewed.";
  return isLiveFlutterwave
    ? `Flutterwave payment could not be started. ${safeMessage} ${fallback}`
    : `${providerLabel} could not be started. ${safeMessage} ${fallback}`;
}
