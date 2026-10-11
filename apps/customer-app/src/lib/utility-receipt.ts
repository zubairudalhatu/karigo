import type { UtilityTransactionSummary } from "@karigo/shared-types";

export function electricityReceiptToken(transaction: UtilityTransactionSummary): string | null {
  if (transaction.serviceType !== "ELECTRICITY" || transaction.status !== "SUCCESSFUL" ||
      transaction.walletDebitStatus === "REVERSED" || transaction.walletReversalReference) return null;
  return transaction.token || transaction.mockToken || null;
}

export function copyElectricityToken(transaction: UtilityTransactionSummary, copy: (value: string) => void): boolean {
  const token = electricityReceiptToken(transaction);
  if (!token) return false;
  copy(token);
  return true;
}

export function utilityReceiptMessage(transaction: UtilityTransactionSummary): string {
  if (transaction.walletReversalReference || transaction.walletDebitStatus === "REVERSED") {
    return transaction.status === "CANCELLED" ? "This utility request was cancelled and your wallet has been reversed." : "This utility request was compensated. Contact support if provider fulfilment is shown.";
  }
  if (transaction.status === "SUCCESSFUL") return "Your utility request was successful.";
  if (transaction.status === "FAILED") return "This utility request failed. If your wallet was debited, KariGO will confirm its reversal.";
  if (transaction.status === "CANCELLED") return "This utility request was cancelled before fulfilment.";
  return transaction.serviceType === "ELECTRICITY"
    ? "Your electricity request is being confirmed. Do not pay again. Your token will appear here once the provider completes the transaction."
    : "Your request is being confirmed. Do not pay again. Fulfilment will appear here once the provider completes the transaction.";
}
