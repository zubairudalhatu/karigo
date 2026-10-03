import { BadRequestException } from "@nestjs/common";
import { AdCampaignStatus } from "@prisma/client";
import { assertAdTransition, ctr, deliveryBudgetEligible, matchesAdTargeting, normalizeApprovedDestination, validateCampaignPlan } from "./ad-policy";

describe("ad policy", () => {
  it("allows governed transitions and rejects arbitrary state changes", () => {
    expect(() => assertAdTransition(AdCampaignStatus.DRAFT, AdCampaignStatus.SUBMITTED)).not.toThrow();
    expect(() => assertAdTransition(AdCampaignStatus.ACTIVE, AdCampaignStatus.REJECTED)).toThrow(BadRequestException);
  });

  it("accepts only normalized HTTPS destinations", () => {
    expect(normalizeApprovedDestination("https://EXAMPLE.com/shop#offer")).toBe("https://example.com/shop");
    for (const unsafe of ["javascript:alert(1)", "data:text/plain,x", "http://example.com", "https://user:pass@example.com"]) {
      expect(() => normalizeApprovedDestination(unsafe)).toThrow(BadRequestException);
    }
  });

  it("validates integer budget relationships and schedule order", () => {
    expect(() => validateCampaignPlan({ requestedBudgetKobo: 10_000, dailyBudgetKobo: 2_000 })).not.toThrow();
    expect(() => validateCampaignPlan({ requestedBudgetKobo: 1_000, dailyBudgetKobo: 2_000 })).toThrow(BadRequestException);
    expect(() => validateCampaignPlan({ startsAt: new Date("2026-10-02"), endsAt: new Date("2026-10-01") })).toThrow(BadRequestException);
  });

  it("calculates CTR without inventing reach", () => {
    expect(ctr(200, 5)).toBe(2.5);
    expect(ctr(0, 5)).toBe(0);
  });

  it("fails closed when configured targeting context is absent or mismatched", () => {
    const targeting = { cityCodes: ["Abuja"], serviceCategories: ["FOOD"] };
    expect(matchesAdTargeting(targeting, null, "FOOD")).toBe(false);
    expect(matchesAdTargeting(targeting, { city: "Abuja" }, undefined)).toBe(false);
    expect(matchesAdTargeting(targeting, { city: " abuja " }, "food")).toBe(true);
    expect(matchesAdTargeting({}, null)).toBe(true);
  });

  it("covers the release-gate global, city, unknown-location, non-matching-city and category cases", () => {
    expect(matchesAdTargeting({}, null, undefined)).toBe(true);
    expect(matchesAdTargeting({ cityCodes: ["Abuja"] }, { city: "Abuja" }, undefined)).toBe(true);
    expect(matchesAdTargeting({ cityCodes: ["Abuja"] }, null, undefined)).toBe(false);
    expect(matchesAdTargeting({ cityCodes: ["Abuja"] }, { city: "Kano" }, undefined)).toBe(false);
    expect(matchesAdTargeting({ serviceCategories: ["FOOD"] }, { city: "Kano" }, "FOOD")).toBe(true);
    expect(matchesAdTargeting({ serviceCategories: ["FOOD"] }, { city: "Kano" }, "RIDE")).toBe(false);
  });

  it("stops delivery at total, daily, or vendor reservation limits", () => {
    const base = { requestedBudgetKobo: 10_000, dailyBudgetKobo: 2_000, spentKobo: 1_000, spentTodayKobo: 500, vendorFunded: true, reservedCreditKobo: 10_000 };
    expect(deliveryBudgetEligible(base)).toBe(true);
    expect(deliveryBudgetEligible({ ...base, spentKobo: 10_000 })).toBe(false);
    expect(deliveryBudgetEligible({ ...base, spentTodayKobo: 2_000 })).toBe(false);
    expect(deliveryBudgetEligible({ ...base, reservedCreditKobo: 1_000 })).toBe(false);
  });

  it("rejects unsafe and oversized destinations", () => {
    for (const unsafe of ["file:///tmp/a", "https://[::1", `https://example.com/${"a".repeat(501)}`]) {
      expect(() => normalizeApprovedDestination(unsafe)).toThrow(BadRequestException);
    }
    expect(normalizeApprovedDestination("https://EXAMPLE.COM:443/a#frag")).toBe("https://example.com/a");
  });
});
