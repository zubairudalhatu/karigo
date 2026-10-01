CREATE TYPE "VendorEvidenceAvailabilityState" AS ENUM (
  'AVAILABLE',
  'SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED',
  'SUPERSEDED_BY_REPLACEMENT'
);

ALTER TABLE "vendor_onboarding_documents"
  ADD COLUMN "evidenceAvailability" "VendorEvidenceAvailabilityState" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "replacesDocumentId" UUID;

CREATE UNIQUE INDEX "vendor_onboarding_documents_replacesDocumentId_key"
  ON "vendor_onboarding_documents"("replacesDocumentId");

ALTER TABLE "vendor_onboarding_documents"
  ADD CONSTRAINT "vendor_onboarding_documents_replacesDocumentId_fkey"
  FOREIGN KEY ("replacesDocumentId") REFERENCES "vendor_onboarding_documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM "vendor_onboarding_documents"
  WHERE LEFT(MD5("id"::text), 12) IN (
    'b4187a1e25f4', '27086d6f9159', '366884c52ff2', '9d454899b7cf',
    'd715c26d6661', 'dfa6a5b2d7f0', 'e878295e490a'
  )
    AND "verificationStatus" = 'APPROVED'
    AND "storageKey" IS NULL
    AND "deletedAt" IS NULL;

  IF affected_count <> 7 THEN
    RAISE EXCEPTION 'Task 209B Partner evidence guard expected 7 eligible historical records, found %', affected_count;
  END IF;

  UPDATE "vendor_onboarding_documents"
  SET "evidenceAvailability" = 'SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED'
  WHERE LEFT(MD5("id"::text), 12) IN (
    'b4187a1e25f4', '27086d6f9159', '366884c52ff2', '9d454899b7cf',
    'd715c26d6661', 'dfa6a5b2d7f0', 'e878295e490a'
  )
    AND "verificationStatus" = 'APPROVED'
    AND "storageKey" IS NULL
    AND "deletedAt" IS NULL;
END $$;
