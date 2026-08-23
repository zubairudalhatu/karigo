import { deriveRideEarningPresentation } from "./ride-earning-presentation";

describe("Ride earning presentation", () => {
  it("describes a Cash Ride with commission outstanding as collected with a KariGO fee due", () => {
    expect(deriveRideEarningPresentation({
      paymentMethod: "CASH",
      outstandingKarigoCommissionKobo: 32_000,
      settlementStatus: "PENDING"
    })).toEqual({
      paymentCollectionState: "CASH_COLLECTED",
      captainSettlementState: "KARIGO_FEE_DUE",
      captainPayoutState: "NOT_APPLICABLE",
      displayStatus: "CASH_COLLECTED",
      secondaryDisplayStatus: "KARIGO_FEE_DUE"
    });
  });

  it("describes a fully remitted Cash Ride as reconciled even if its raw status has not caught up", () => {
    expect(deriveRideEarningPresentation({
      paymentMethod: "cash",
      outstandingKarigoCommissionKobo: 0,
      settlementStatus: "PARTIALLY_RECONCILED"
    })).toMatchObject({
      paymentCollectionState: "CASH_COLLECTED",
      captainSettlementState: "RECONCILED",
      captainPayoutState: "NOT_APPLICABLE",
      displayStatus: "RECONCILED"
    });
  });

  it.each(["CARD", "BANK_TRANSFER", "WALLET"])(
    "describes an unpaid future %s Ride as payout pending",
    (paymentMethod) => {
      expect(deriveRideEarningPresentation({
        paymentMethod,
        outstandingKarigoCommissionKobo: 0,
        settlementStatus: "PENDING"
      })).toMatchObject({
        paymentCollectionState: "ELECTRONIC_COLLECTED",
        captainSettlementState: "PAYOUT_PENDING",
        captainPayoutState: "PENDING",
        displayStatus: "PAYOUT_PENDING"
      });
    }
  );

  it("describes a reconciled future electronic Ride as paid", () => {
    expect(deriveRideEarningPresentation({
      paymentMethod: "CARD",
      outstandingKarigoCommissionKobo: 0,
      settlementStatus: "RECONCILED"
    })).toMatchObject({
      captainSettlementState: "PAID",
      captainPayoutState: "PAID",
      displayStatus: "PAID"
    });
  });
});
