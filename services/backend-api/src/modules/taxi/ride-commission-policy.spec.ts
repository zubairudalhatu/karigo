import {
  captainCommissionObligationKobo,
  captainCommissionOutstandingKobo,
  evaluateRideCommissionEligibility
} from "./ride-commission-policy";

const thresholds = { warningKobo: 800_000, urgentKobo: 900_000, blockKobo: 1_000_000 };

describe("Ride commission eligibility policy", () => {
  it.each([
    [799_900, "ELIGIBLE", true],
    [800_000, "WARNING", true],
    [900_000, "URGENT", true],
    [999_999, "URGENT", true],
    [1_000_000, "BLOCKED", false],
    [1_250_000, "BLOCKED", false]
  ])("classifies %i kobo at the production thresholds", (outstandingKobo, level, rideEligible) => {
    expect(evaluateRideCommissionEligibility(outstandingKobo, thresholds)).toMatchObject({
      outstandingKobo,
      level,
      rideEligible
    });
  });

  it("keeps the original Captain commission non-negative after a fully remitted platform-funded refund", () => {
    const physicalQaPosition = {
      platformReceivableKobo: 17_000,
      platformAdjustmentKobo: -20_000,
      remittedKobo: 17_000,
      refunds: [{ platformResponsibilityKobo: 20_000 }]
    };

    expect(captainCommissionObligationKobo(physicalQaPosition)).toBe(17_000);
    expect(captainCommissionOutstandingKobo(physicalQaPosition)).toBe(0);
  });

  it.each([
    ["Captain-funded", 0, 0],
    ["shared", -5_000, 5_000],
    ["unresolved", 0, 0],
    ["settled platform-funded", -20_000, 20_000]
  ])("applies %s refund responsibility explicitly without deriving a negative obligation", (_label, platformAdjustmentKobo, platformResponsibilityKobo) => {
    const position = {
      platformReceivableKobo: 17_000,
      platformAdjustmentKobo,
      remittedKobo: 17_000,
      refunds: [{ platformResponsibilityKobo }]
    };

    expect(captainCommissionObligationKobo(position)).toBe(17_000);
    expect(captainCommissionOutstandingKobo(position)).toBe(0);
  });
});
