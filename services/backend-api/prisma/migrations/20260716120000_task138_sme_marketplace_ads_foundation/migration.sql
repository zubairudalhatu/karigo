-- Task 138: SME Services customer marketplace, reviews, and controlled ads foundation.

CREATE TYPE "AdCampaignStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE "AdSponsorType" AS ENUM (
  'VENDOR',
  'EXTERNAL'
);

CREATE TYPE "AdPlacementSurface" AS ENUM (
  'CUSTOMER_HOME_FEATURED'
);

CREATE TYPE "VendorAdCreditLedgerEntryType" AS ENUM (
  'ADMIN_GRANT',
  'AD_CAMPAIGN_RESERVATION',
  'AD_CAMPAIGN_RELEASE',
  'AD_CAMPAIGN_SPEND'
);

CREATE TYPE "VendorAdCreditLedgerDirection" AS ENUM (
  'CREDIT',
  'DEBIT'
);

ALTER TABLE "service_provider_requests" ADD COLUMN "preferredProviderId" UUID;
ALTER TABLE "service_providers" ADD COLUMN "publicBio" TEXT;
ALTER TABLE "service_providers" ADD COLUMN "profileImageUrl" TEXT;
ALTER TABLE "service_providers" ADD COLUMN "averageRating" DECIMAL(3,2);
ALTER TABLE "service_providers" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "service_providers" ADD COLUMN "completedServices" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "service_provider_reviews" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_provider_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_campaigns" (
  "id" UUID NOT NULL,
  "campaignReference" TEXT NOT NULL,
  "sponsorType" "AdSponsorType" NOT NULL,
  "vendorId" UUID,
  "placementSurface" "AdPlacementSurface" NOT NULL DEFAULT 'CUSTOMER_HOME_FEATURED',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "advertiserName" TEXT,
  "advertiserContactName" TEXT,
  "advertiserEmail" TEXT,
  "advertiserPhone" TEXT,
  "requestedBudgetKobo" INTEGER NOT NULL DEFAULT 0,
  "reservedCreditKobo" INTEGER NOT NULL DEFAULT 0,
  "status" "AdCampaignStatus" NOT NULL DEFAULT 'SUBMITTED',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "adminNote" TEXT,
  "rejectionReason" TEXT,
  "reviewedByAdminId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_ad_credit_accounts" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "balanceKobo" INTEGER NOT NULL DEFAULT 0,
  "reservedKobo" INTEGER NOT NULL DEFAULT 0,
  "lifetimeGrantedKobo" INTEGER NOT NULL DEFAULT 0,
  "lifetimeSpentKobo" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_ad_credit_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_ad_credit_ledger_entries" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "campaignId" UUID,
  "entryType" "VendorAdCreditLedgerEntryType" NOT NULL,
  "direction" "VendorAdCreditLedgerDirection" NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "balanceBeforeKobo" INTEGER NOT NULL,
  "balanceAfterKobo" INTEGER NOT NULL,
  "reference" TEXT NOT NULL,
  "description" TEXT,
  "createdByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_ad_credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_provider_reviews_requestId_key" ON "service_provider_reviews"("requestId");
CREATE INDEX "service_provider_reviews_providerId_createdAt_idx" ON "service_provider_reviews"("providerId", "createdAt");
CREATE INDEX "service_provider_reviews_customerId_createdAt_idx" ON "service_provider_reviews"("customerId", "createdAt");
CREATE INDEX "service_provider_requests_preferredProviderId_status_idx" ON "service_provider_requests"("preferredProviderId", "status");

CREATE UNIQUE INDEX "ad_campaigns_campaignReference_key" ON "ad_campaigns"("campaignReference");
CREATE INDEX "ad_campaigns_status_placementSurface_idx" ON "ad_campaigns"("status", "placementSurface");
CREATE INDEX "ad_campaigns_vendorId_status_idx" ON "ad_campaigns"("vendorId", "status");

CREATE UNIQUE INDEX "vendor_ad_credit_accounts_vendorId_key" ON "vendor_ad_credit_accounts"("vendorId");
CREATE UNIQUE INDEX "vendor_ad_credit_ledger_entries_reference_key" ON "vendor_ad_credit_ledger_entries"("reference");
CREATE INDEX "vendor_ad_credit_ledger_entries_vendorId_createdAt_idx" ON "vendor_ad_credit_ledger_entries"("vendorId", "createdAt");
CREATE INDEX "vendor_ad_credit_ledger_entries_campaignId_idx" ON "vendor_ad_credit_ledger_entries"("campaignId");

ALTER TABLE "service_provider_requests" ADD CONSTRAINT "service_provider_requests_preferredProviderId_fkey" FOREIGN KEY ("preferredProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_provider_reviews" ADD CONSTRAINT "service_provider_reviews_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_provider_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_provider_reviews" ADD CONSTRAINT "service_provider_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_provider_reviews" ADD CONSTRAINT "service_provider_reviews_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_ad_credit_accounts" ADD CONSTRAINT "vendor_ad_credit_accounts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_ad_credit_ledger_entries" ADD CONSTRAINT "vendor_ad_credit_ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "vendor_ad_credit_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_ad_credit_ledger_entries" ADD CONSTRAINT "vendor_ad_credit_ledger_entries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
