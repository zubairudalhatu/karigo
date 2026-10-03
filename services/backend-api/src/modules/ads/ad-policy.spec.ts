import { BadRequestException } from "@nestjs/common";
import { AdCampaignStatus } from "@prisma/client";
import { assertAdTransition, ctr, normalizeApprovedDestination, validateCampaignPlan } from "./ad-policy";

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
});
