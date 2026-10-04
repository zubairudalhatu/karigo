import { customerAdPlacementDecision } from "./customer-ad-placement";

describe("customerAdPlacementDecision", () => {
  it("gives eligible KariGO inventory priority", () => {
    expect(customerAdPlacementDecision(1, true)).toEqual({
      source: "KARIGO",
      reason: "ELIGIBLE_KARIGO_CAMPAIGN"
    });
  });

  it("permits AdMob only when KariGO inventory is empty", () => {
    expect(customerAdPlacementDecision(0, true)).toEqual({
      source: "ADMOB_FALLBACK",
      reason: "NO_KARIGO_INVENTORY"
    });
  });

  it("can explicitly return no commercial placement", () => {
    expect(customerAdPlacementDecision(0, false)).toEqual({
      source: "NONE",
      reason: "FALLBACK_DISABLED"
    });
  });
});
