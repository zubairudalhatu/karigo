ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'PHARMACY';

CREATE TYPE "VendorApplicationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'PROVISIONALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'WITHDRAWN'
);

CREATE TYPE "VendorApplicationCategory" AS ENUM (
  'RESTAURANT',
  'GROCERIES',
  'MARKET_ITEMS',
  'PHARMACY',
  'PARCEL_LOGISTICS_PARTNER',
  'SME_SERVICES',
  'OTHER_MARKETPLACE_VENDOR'
);

CREATE TYPE "PreferredContactMethod" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP');

CREATE TABLE "vendor_applications" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "businessCategory" "VendorApplicationCategory" NOT NULL,
  "businessName" TEXT NOT NULL,
  "tradingName" TEXT,
  "businessType" TEXT,
  "businessDescription" TEXT NOT NULL,
  "businessAddress" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "area" TEXT,
  "serviceAreas" JSONB,
  "operatingHours" TEXT,
  "businessPhoneNumber" TEXT NOT NULL,
  "businessEmail" TEXT NOT NULL,
  "websiteOrSocialLink" TEXT,
  "contactFullName" TEXT NOT NULL,
  "contactRole" TEXT NOT NULL,
  "contactPhoneNumber" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'PHONE',
  "deliveryReadiness" TEXT,
  "deliveryPreference" TEXT,
  "averagePreparationTime" TEXT,
  "numberOfStaff" TEXT,
  "catalogueCategory" TEXT,
  "estimatedCatalogueSize" TEXT,
  "existingDelivery" TEXT,
  "brandAssets" JSONB,
  "documentPlaceholders" JSONB,
  "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
  "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
  "contactConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
  "status" "VendorApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendor_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_application_reviews" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "reviewerId" UUID,
  "status" "VendorApplicationStatus" NOT NULL,
  "notes" TEXT,
  "checklist" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendor_application_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendor_application_status_history" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "fromStatus" "VendorApplicationStatus",
  "toStatus" "VendorApplicationStatus" NOT NULL,
  "note" TEXT,
  "changedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendor_application_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_applications_reference_key" ON "vendor_applications"("reference");
CREATE INDEX "vendor_applications_status_idx" ON "vendor_applications"("status");
CREATE INDEX "vendor_applications_businessCategory_idx" ON "vendor_applications"("businessCategory");
CREATE INDEX "vendor_applications_submittedAt_idx" ON "vendor_applications"("submittedAt");
CREATE INDEX "vendor_application_reviews_applicationId_createdAt_idx" ON "vendor_application_reviews"("applicationId", "createdAt");
CREATE INDEX "vendor_application_status_history_applicationId_createdAt_idx" ON "vendor_application_status_history"("applicationId", "createdAt");

ALTER TABLE "vendor_application_reviews" ADD CONSTRAINT "vendor_application_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_application_status_history" ADD CONSTRAINT "vendor_application_status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
