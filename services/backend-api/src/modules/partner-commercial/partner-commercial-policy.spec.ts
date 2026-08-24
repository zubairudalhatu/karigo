import { PartnerCommercialModel, VendorApplicationCategory } from "@prisma/client";
import { assertCategoryCommercialRule, calculatePartnerSettlementKobo } from "./partner-commercial-policy";

describe("Partner launch commercial policy", () => {
  const valid = (businessCategory: VendorApplicationCategory, commercialModel: PartnerCommercialModel, commissionRateBasisPoints: number, publicOnboardingEnabled = true) =>
    expect(() => assertCategoryCommercialRule({ businessCategory, commercialModel, commissionRateBasisPoints, publicOnboardingEnabled })).not.toThrow();

  it("locks Restaurant to 10% commission", () => {
    valid(VendorApplicationCategory.RESTAURANT, PartnerCommercialModel.COMMISSION, 1_000);
    expect(() => assertCategoryCommercialRule({ businessCategory: VendorApplicationCategory.RESTAURANT, commercialModel: PartnerCommercialModel.COMMISSION, commissionRateBasisPoints: 1_500, publicOnboardingEnabled: true })).toThrow("10% KariGO commission");
  });

  it.each([
    VendorApplicationCategory.GROCERIES,
    VendorApplicationCategory.MARKET_ITEMS,
    VendorApplicationCategory.PHARMACY,
    VendorApplicationCategory.SME_SERVICES
  ])("locks %s to zero commission plus onboarding-fee model", (category) => {
    valid(category, PartnerCommercialModel.ONBOARDING_FEE, 0);
    expect(() => assertCategoryCommercialRule({ businessCategory: category, commercialModel: PartnerCommercialModel.COMMISSION, commissionRateBasisPoints: 1_500, publicOnboardingEnabled: true })).toThrow("0% commission");
  });

  it("keeps third-party parcel private and quotation-based", () => {
    valid(VendorApplicationCategory.PARCEL_LOGISTICS_PARTNER, PartnerCommercialModel.QUOTATION, 0, false);
    expect(() => assertCategoryCommercialRule({ businessCategory: VendorApplicationCategory.PARCEL_LOGISTICS_PARTNER, commercialModel: PartnerCommercialModel.QUOTATION, commissionRateBasisPoints: 0, publicOnboardingEnabled: true })).toThrow("remain private");
  });

  it("keeps Other Marketplace review-required", () => {
    valid(VendorApplicationCategory.OTHER_MARKETPLACE_VENDOR, PartnerCommercialModel.REVIEW_REQUIRED, 0);
  });

  it("uses exact kobo arithmetic and excludes delivery fee from Restaurant commission", () => {
    expect(calculatePartnerSettlementKobo({ merchandiseSubtotalKobo: 1_000_000, deliveryFeeKobo: 150_000, commissionRateBasisPoints: 1_000 })).toEqual({
      commissionableSubtotalKobo: 1_000_000,
      deliveryFeeExcludedKobo: 150_000,
      commissionRateBasisPoints: 1_000,
      commissionKobo: 100_000,
      partnerNetMerchandiseKobo: 900_000
    });
  });

  it.each([
    VendorApplicationCategory.GROCERIES,
    VendorApplicationCategory.MARKET_ITEMS,
    VendorApplicationCategory.PHARMACY,
    VendorApplicationCategory.SME_SERVICES
  ])("deducts no sales/service commission for %s", (category) => {
    valid(category, PartnerCommercialModel.ONBOARDING_FEE, 0);
    const settlement = calculatePartnerSettlementKobo({ merchandiseSubtotalKobo: 837_455, deliveryFeeKobo: 123_400, commissionRateBasisPoints: 0 });
    expect(settlement.commissionKobo).toBe(0);
    expect(settlement.partnerNetMerchandiseKobo).toBe(837_455);
    expect(settlement.deliveryFeeExcludedKobo).toBe(123_400);
  });
});
