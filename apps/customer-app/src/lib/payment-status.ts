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
  squad: "Squad Sandbox"
};

// Squad sandbox is deferred until provider setup/API payload is confirmed.
export const customerTestPaymentProviderOptions: Array<{
  value: CustomerTestPaymentProvider;
  title: string;
  description: string;
}> = [
  {
    value: "mock",
    title: "Mock Payment",
    description: "Instant staging fallback for the Kano pilot."
  },
  {
    value: "monnify",
    title: "Monnify Sandbox",
    description: "Opens a Monnify sandbox checkout page when sandbox credentials are configured."
  },
  {
    value: "paystack",
    title: "Paystack Test Mode",
    description: "Opens a Paystack sandbox checkout page when test credentials are configured."
  }
];

export function paymentProviderLabel(provider?: string | null): string {
  if (provider && provider in paymentProviderLabels) {
    return paymentProviderLabels[provider as CustomerTestPaymentProvider];
  }
  return "Sandbox payment";
}

export const paymentSafetyNote =
  "Mock, Monnify Sandbox and Paystack Test Mode are for staging checkout verification only. Live payments, wallet funding, automatic refunds and payout automation remain disabled.";

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
        actionHint: "Use mock payment or an approved sandbox payment provider only."
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

export function paymentVerificationFailureMessage(message: string): string {
  return `Payment could not be verified yet. ${message} If you cancelled or did not complete checkout, reopen the payment page and try again.`;
}

export function paymentInitializationFailureMessage(providerLabel: string, message: string): string {
  const normalizedMessage = message.trim();
  const safeMessage = /^internal server error$/i.test(normalizedMessage)
    ? "The sandbox provider could not be started safely."
    : normalizedMessage || "The sandbox provider could not be started safely.";
  return `${providerLabel} could not be started. ${safeMessage} You can select Mock payment to continue staging checkout while sandbox configuration is reviewed.`;
}
