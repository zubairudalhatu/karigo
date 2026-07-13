export type PaymentStatusView = {
  title: string;
  body: string;
  actionHint: string;
};

export const paymentSafetyNote =
  "Paystack Test Mode is for staging checkout verification only. Wallet funding, automatic refunds and payout automation remain disabled.";

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
        actionHint: "Use mock payment or approved Paystack Test Mode only."
      };
  }
}

export function pendingAuthorizationCopy(): PaymentStatusView {
  return {
    title: "Paystack Test Mode authorization",
    body: "Complete the Paystack Test Mode checkout page, return to KariGO, then verify payment here.",
    actionHint: "KariGO will only mark the order paid after backend verification."
  };
}

export function paymentVerificationFailureMessage(message: string): string {
  return `Payment could not be verified yet. ${message} If you cancelled or did not complete checkout, reopen the payment page and try again.`;
}
