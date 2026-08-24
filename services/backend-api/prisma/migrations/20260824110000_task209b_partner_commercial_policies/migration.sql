-- Task 209B-S1-H11.2: additive Partner commercial policy and accepted-term snapshots.
-- Historical Vendor commission rates and VendorSettlement rows are intentionally untouched.

CREATE TYPE "PartnerCommercialModel" AS ENUM ('COMMISSION', 'ONBOARDING_FEE', 'QUOTATION', 'REVIEW_REQUIRED');
CREATE TYPE "PartnerOnboardingPaymentStatus" AS ENUM ('PENDING', 'INITIALIZED', 'SUCCESSFUL', 'VERIFICATION_FAILED', 'FAILED', 'CANCELLED', 'REVIEW_REQUIRED');

CREATE TABLE "partner_commercial_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "businessCategory" "VendorApplicationCategory" NOT NULL,
  "commercialModel" "PartnerCommercialModel" NOT NULL,
  "commissionRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "onboardingFeeKobo" INTEGER,
  "renewalFeeKobo" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "publicOnboardingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "publicTitle" TEXT NOT NULL,
  "publicSummary" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "internalNote" TEXT,
  "createdByAdminId" UUID,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_commercial_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_commercial_agreements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL,
  "applicantUserId" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "category" "VendorApplicationCategory" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "commercialModel" "PartnerCommercialModel" NOT NULL,
  "commissionRateBasisPoints" INTEGER NOT NULL,
  "onboardingFeeKobo" INTEGER,
  "renewalFeeKobo" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "publicTitleSnapshot" TEXT NOT NULL,
  "publicSummarySnapshot" TEXT NOT NULL,
  "policySnapshot" JSONB NOT NULL,
  "policyHash" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedTermsVersion" TEXT NOT NULL,
  "acceptedFromAppSurface" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_commercial_agreements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_onboarding_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agreementId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "transactionReference" TEXT NOT NULL,
  "providerTransactionReference" TEXT,
  "amountKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PartnerOnboardingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "authorizationUrl" TEXT,
  "providerResponse" JSONB,
  "initializedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_onboarding_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_onboarding_fee_waivers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agreementId" UUID NOT NULL,
  "amountWaivedKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "waivedByAdminId" UUID NOT NULL,
  "waivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_onboarding_fee_waivers_pkey" PRIMARY KEY ("id")
ALTER TABLE "vendor_settlements" ADD COLUMN "commercialAgreementId" UUID;
ALTER TABLE "vendor_settlements" ADD COLUMN "commercialModel" "PartnerCommercialModel";
ALTER TABLE "vendor_settlements" ADD COLUMN "commissionableSubtotal" DECIMAL(12,2);
ALTER TABLE "vendor_settlements" ADD COLUMN "deliveryFeeExcluded" DECIMAL(12,2);
);

ALTER TABLE "vendors" ADD COLUMN "commercialAgreementId" UUID;

CREATE UNIQUE INDEX "partner_commercial_policies_businessCategory_policyVersion_key" ON "partner_commercial_policies"("businessCategory", "policyVersion");
CREATE INDEX "partner_commercial_policies_businessCategory_isActive_effectiveFrom_idx" ON "partner_commercial_policies"("businessCategory", "isActive", "effectiveFrom");
CREATE INDEX "partner_commercial_policies_isActive_effectiveFrom_effectiveTo_idx" ON "partner_commercial_policies"("isActive", "effectiveFrom", "effectiveTo");
CREATE UNIQUE INDEX "partner_commercial_agreements_applicationId_key" ON "partner_commercial_agreements"("applicationId");
CREATE INDEX "partner_commercial_agreements_applicantUserId_acceptedAt_idx" ON "partner_commercial_agreements"("applicantUserId", "acceptedAt");
CREATE INDEX "partner_commercial_agreements_category_commercialModel_idx" ON "partner_commercial_agreements"("category", "commercialModel");
CREATE INDEX "partner_commercial_agreements_policyId_idx" ON "partner_commercial_agreements"("policyId");
CREATE UNIQUE INDEX "partner_onboarding_payments_transactionReference_key" ON "partner_onboarding_payments"("transactionReference");
CREATE UNIQUE INDEX "partner_onboarding_payments_providerTransactionReference_key" ON "partner_onboarding_payments"("providerTransactionReference");
CREATE INDEX "partner_onboarding_payments_agreementId_status_createdAt_idx" ON "partner_onboarding_payments"("agreementId", "status", "createdAt");
CREATE INDEX "partner_onboarding_payments_provider_status_idx" ON "partner_onboarding_payments"("provider", "status");
CREATE UNIQUE INDEX "partner_onboarding_fee_waivers_agreementId_key" ON "partner_onboarding_fee_waivers"("agreementId");
CREATE INDEX "partner_onboarding_fee_waivers_waivedByAdminId_waivedAt_idx" ON "partner_onboarding_fee_waivers"("waivedByAdminId", "waivedAt");
CREATE UNIQUE INDEX "vendors_commercialAgreementId_key" ON "vendors"("commercialAgreementId");

ALTER TABLE "partner_commercial_agreements" ADD CONSTRAINT "partner_commercial_agreements_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_commercial_agreements" ADD CONSTRAINT "partner_commercial_agreements_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "vendor_settlements_commercialAgreementId_idx" ON "vendor_settlements"("commercialAgreementId");

ALTER TABLE "partner_commercial_agreements" ADD CONSTRAINT "partner_commercial_agreements_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "partner_commercial_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_onboarding_payments" ADD CONSTRAINT "partner_onboarding_payments_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "partner_commercial_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_onboarding_fee_waivers" ADD CONSTRAINT "partner_onboarding_fee_waivers_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "partner_commercial_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_commercialAgreementId_fkey" FOREIGN KEY ("commercialAgreementId") REFERENCES "partner_commercial_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "partner_commercial_policies" (
  "id", "businessCategory", "commercialModel", "commissionRateBasisPoints", "onboardingFeeKobo", "currency",
  "effectiveFrom", "isActive", "publicOnboardingEnabled", "publicTitle", "publicSummary", "policyVersion", "internalNote"
) VALUES
  (gen_random_uuid(), 'RESTAURANT', 'COMMISSION', 1000, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'KariGO Restaurant Partner', 'Current KariGO commission under this commercial agreement: 10% of restaurant merchandise subtotal. KariGO delivery fees are excluded.', 'launch-2026-08-v1', 'System launch policy; no historical Vendor rows changed.'),
  (gen_random_uuid(), 'GROCERIES', 'ONBOARDING_FEE', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'KariGO Grocery Partner', '0% KariGO sales commission. A KariGO onboarding/platform fee applies when configured and accepted.', 'launch-2026-08-v1', 'Fee intentionally not configured; missing is not zero.'),
  (gen_random_uuid(), 'MARKET_ITEMS', 'ONBOARDING_FEE', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'KariGO Market Items Partner', '0% KariGO sales commission. A KariGO onboarding/platform fee applies when configured and accepted.', 'launch-2026-08-v1', 'Fee intentionally not configured; missing is not zero.'),
  (gen_random_uuid(), 'PHARMACY', 'ONBOARDING_FEE', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'KariGO Pharmacy Partner', '0% KariGO sales commission. The onboarding/platform fee does not replace regulatory, document or KariGO approval.', 'launch-2026-08-v1', 'Fee intentionally not configured; pharmacy compliance remains separate.'),
  (gen_random_uuid(), 'SME_SERVICES', 'ONBOARDING_FEE', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'KariGO SME Services Partner', '0% KariGO service commission. A KariGO onboarding/platform fee applies when configured and accepted.', 'launch-2026-08-v1', 'Fee intentionally not configured; no job-value commission.'),
  (gen_random_uuid(), 'PARCEL_LOGISTICS_PARTNER', 'QUOTATION', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, false,
   'KariGO Parcel Delivery', 'Parcel delivery is operated by KariGO through a quotation workflow. Third-party parcel Partner onboarding is not publicly available.', 'launch-2026-08-v1', 'Reserved future database capability; public onboarding disabled.'),
  (gen_random_uuid(), 'OTHER_MARKETPLACE_VENDOR', 'REVIEW_REQUIRED', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, true,
   'Other KariGO Marketplace Partner', 'KariGO must review and classify the appropriate commercial terms before this Partner can be activated.', 'launch-2026-08-v1', 'No commercial model is assigned silently.');
ALTER TABLE "vendor_settlements" ADD CONSTRAINT "vendor_settlements_commercialAgreementId_fkey" FOREIGN KEY ("commercialAgreementId") REFERENCES "partner_commercial_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
