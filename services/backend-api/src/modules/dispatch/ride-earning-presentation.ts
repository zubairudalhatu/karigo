export type RidePaymentCollectionState = "CASH_COLLECTED" | "ELECTRONIC_COLLECTED";
export type CaptainRideSettlementState = "KARIGO_FEE_DUE" | "RECONCILED" | "PAYOUT_PENDING" | "PAID";
export type CaptainRidePayoutState = "NOT_APPLICABLE" | "PENDING" | "PAID";
export type CaptainRideDisplayStatus = "CASH_COLLECTED" | "RECONCILED" | "PAYOUT_PENDING" | "PAID";

export interface RideEarningPresentationInput {
  paymentMethod: string;
  outstandingKarigoCommissionKobo: number;
  settlementStatus: string;
}

export function deriveRideEarningPresentation(input: RideEarningPresentationInput) {
  const cashPayment = input.paymentMethod.trim().toUpperCase() === "CASH";

  if (cashPayment) {
    const feeDue = input.outstandingKarigoCommissionKobo > 0;
    return {
      paymentCollectionState: "CASH_COLLECTED" as const,
      captainSettlementState: feeDue ? "KARIGO_FEE_DUE" as const : "RECONCILED" as const,
      captainPayoutState: "NOT_APPLICABLE" as const,
      displayStatus: feeDue ? "CASH_COLLECTED" as const : "RECONCILED" as const,
      secondaryDisplayStatus: feeDue ? "KARIGO_FEE_DUE" as const : null
    };
  }

  const captainPaid = input.settlementStatus.trim().toUpperCase() === "RECONCILED";
  return {
    paymentCollectionState: "ELECTRONIC_COLLECTED" as const,
    captainSettlementState: captainPaid ? "PAID" as const : "PAYOUT_PENDING" as const,
    captainPayoutState: captainPaid ? "PAID" as const : "PENDING" as const,
    displayStatus: captainPaid ? "PAID" as const : "PAYOUT_PENDING" as const,
    secondaryDisplayStatus: null
  };
}
