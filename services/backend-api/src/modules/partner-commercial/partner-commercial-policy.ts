import { PartnerCommercialModel, VendorApplicationCategory } from "@prisma/client";

export const PARTNER_TERMS_VERSION = "partner-commercial-terms-v1";

export const ONBOARDING_FEE_CATEGORIES = new Set<VendorApplicationCategory>([
  VendorApplicationCategory.GROCERIES,
  VendorApplicationCategory.MARKET_ITEMS,
  VendorApplicationCategory.PHARMACY,
  VendorApplicationCategory.SME_SERVICES
]);

export function assertCategoryCommercialRule(input: {
  businessCategory: VendorApplicationCategory;
  commercialModel: PartnerCommercialModel;
  commissionRateBasisPoints: number;
  publicOnboardingEnabled: boolean;
}) {
  const { businessCategory, commercialModel, commissionRateBasisPoints } = input;
  if (!Number.isInteger(commissionRateBasisPoints) || commissionRateBasisPoints < 0 || commissionRateBasisPoints > 10_000) {
    throw new Error("Partner commission rate must be an integer from 0 to 10000 basis points.");
  }
  if (businessCategory === VendorApplicationCategory.RESTAURANT && (commercialModel !== PartnerCommercialModel.COMMISSION || commissionRateBasisPoints !== 1_000)) {
    throw new Error("Restaurant launch policy must use a 10% KariGO commission.");
  }
  if (ONBOARDING_FEE_CATEGORIES.has(businessCategory) && (commercialModel !== PartnerCommercialModel.ONBOARDING_FEE || commissionRateBasisPoints !== 0)) {
    throw new Error(`${businessCategory} launch policy must use 0% commission and the onboarding-fee model.`);
  }
  if (businessCategory === VendorApplicationCategory.PARCEL_LOGISTICS_PARTNER && (commercialModel !== PartnerCommercialModel.QUOTATION || input.publicOnboardingEnabled)) {
    throw new Error("Parcel logistics Partner onboarding must remain private and quotation-based.");
  }
  if (businessCategory === VendorApplicationCategory.OTHER_MARKETPLACE_VENDOR && commercialModel !== PartnerCommercialModel.REVIEW_REQUIRED) {
    throw new Error("Other Marketplace Vendor must remain review-required until explicitly classified.");
  }
}

export function calculatePartnerSettlementKobo(input: {
  merchandiseSubtotalKobo: number;
  deliveryFeeKobo: number;
  commissionRateBasisPoints: number;
}) {
  if (![input.merchandiseSubtotalKobo, input.deliveryFeeKobo, input.commissionRateBasisPoints].every(Number.isInteger)) {
    throw new Error("Partner settlement inputs must use integer kobo arithmetic.");
  }
  if (input.merchandiseSubtotalKobo < 0 || input.deliveryFeeKobo < 0) throw new Error("Partner settlement amounts cannot be negative.");
  const commissionKobo = Math.round((input.merchandiseSubtotalKobo * input.commissionRateBasisPoints) / 10_000);
  return {
    commissionableSubtotalKobo: input.merchandiseSubtotalKobo,
    deliveryFeeExcludedKobo: input.deliveryFeeKobo,
    commissionRateBasisPoints: input.commissionRateBasisPoints,
    commissionKobo,
    partnerNetMerchandiseKobo: input.merchandiseSubtotalKobo - commissionKobo
  };
}
