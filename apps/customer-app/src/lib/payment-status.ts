import type { CustomerTestPaymentProvider } from "@karigo/shared-types";

export type PaymentStatusView = {
  title: string;
  body: string;
  actionHint: string;
};

const paymentProviderLabels: Record<CustomerTestPaymentProvider, string> = {
  mock: "Mock Payment",
  paystack: "Paystack Test Mode",
  monnify: "Monnify Sandbox",
  squad: process.env.EXPO_PUBLIC_PAYMENT_LAUNCH_MODE === "squad_live" ? "Squad by GTBank" : "Squad Sandbox"
};

const squadLiveLaunchMode = process.env.EXPO_PUBLIC_PAYMENT_LAUNCH_MODE === "squad_live";
const squadSandboxCheckoutEnabled = process.env.EXPO_PUBLIC_SQUAD_SANDBOX_CHECKOUT_ENABLED === "true";

const stagingPaymentProviderOptions: Array<{
  value: CustomerTestPaymentProvider;
  title: string;
  description: string;
}> = [
  {
    value: "mock",
    title: "Mock Payment",
    description: "Instant staging fallback for the Kano pilot."
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

export const customerTestPaymentProviderOptions: Array<{
  value: CustomerTestPaymentProvider;
  title: string;
  description: string;
}> = squadLiveLaunchMode
  ? [{
      value: "squad",
      title: "Squad by GTBank",
      description: "Primary launch checkout provider. KariGO confirms payment only after backend verification."
    }]
  : stagingPaymentProviderOptions;

export const defaultCustomerPaymentProvider: CustomerTestPaymentProvider = customerTestPaymentProviderOptions[0]?.value ?? "mock";

export function paymentProviderLabel(provider?: string | null): string {
  if (provider && provider in paymentProviderLabels) {
    return paymentProviderLabels[provider as CustomerTestPaymentProvider];
  }
  return "Sandbox payment";
}

export const paymentSafetyNote =
  squadLiveLaunchMode
    ? "Squad by GTBank is the primary launch checkout provider. KariGO verifies payment server-side before marking an order paid. Wallet funding, automatic refunds and payout automation remain disabled."
    : "Mock Payment is for staging fallback. Squad Sandbox is hidden unless explicitly enabled; Monnify and Paystack remain pending approval and are for controlled sandbox/test checks only. Live payments, wallet funding, automatic refunds and payout automation remain disabled.";

export const paymentProviderSelectionTitle = squadLiveLaunchMode ? "Payment provider" : "Test payment provider";

export const paymentProviderSelectionBody = squadLiveLaunchMode
  ? "Squad by GTBank is the approved primary launch checkout provider."
  : "Choose how to verify this staging checkout. Mock payment remains the safe pilot fallback.";

export const paymentProviderSensitiveDataNote = squadLiveLaunchMode
  ? "Use only your own approved payment details. KariGO will not mark the order paid until backend verification succeeds."
  : "Do not use live card, bank or account details during sandbox tests.";

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

export function pendingAuthorizationCopy(providerLabel = "Sandbox payment"): PaymentStatusView {
  return {
    title: `${providerLabel} authorization`,
    body: `Complete the ${providerLabel} checkout page, return to KariGO, then verify payment here.`,
    actionHint: "KariGO will only mark the order paid after backend verification."
  };
}

export function paymentAuthorizationOpenedMessage(providerLabel: string): string {
  const checkoutType = squadLiveLaunchMode ? "payment checkout" : "sandbox checkout";
  return `${providerLabel} opened. Return to KariGO and tap Verify payment after completing the ${checkoutType}.`;
}

export function paymentVerificationFailureMessage(message: string): string {
  return `Payment could not be verified yet. ${message} If you cancelled or did not complete checkout, reopen the payment page and try again.`;
}

export function paymentInitializationFailureMessage(providerLabel: string, message: string): string {
  const normalizedMessage = message.trim();
  const defaultFailure = squadLiveLaunchMode
    ? "The payment provider could not be started safely."
    : "The sandbox provider could not be started safely.";
  const safeMessage = /^internal server error$/i.test(normalizedMessage)
    ? defaultFailure
    : normalizedMessage || defaultFailure;
  const fallback = squadLiveLaunchMode
    ? "Please retry payment or contact KariGO support if this continues."
    : "You can select Mock payment to continue staging checkout while provider configuration is reviewed.";
  return `${providerLabel} could not be started. ${safeMessage} ${fallback}`;
}
