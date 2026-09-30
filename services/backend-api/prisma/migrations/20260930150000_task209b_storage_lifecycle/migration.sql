-- Storage lifecycle states distinguish database intent from confirmed physical deletion.
CREATE TYPE "StoredObjectDeletionState" AS ENUM ('PENDING_EXTERNAL_DELETION', 'DELETED', 'RETAINED_FOR_DEFINED_REASON', 'DELETION_FAILED');
CREATE TYPE "StoredObjectRetentionReason" AS ENUM ('ACTIVE_APPLICATION_EVIDENCE', 'APPROVED_ONBOARDING_EVIDENCE');

ALTER TABLE "captain_application_documents"
  ADD COLUMN "externalDeletionState" "StoredObjectDeletionState",
  ADD COLUMN "retentionReason" "StoredObjectRetentionReason",
  ADD COLUMN "deletionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDeletionAttemptAt" TIMESTAMP(3),
  ADD COLUMN "deletionFailureCode" TEXT,
  ADD COLUMN "physicallyDeletedAt" TIMESTAMP(3);

ALTER TABLE "vendor_onboarding_documents"
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "externalDeletionState" "StoredObjectDeletionState",
  ADD COLUMN "retentionReason" "StoredObjectRetentionReason",
  ADD COLUMN "deletionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDeletionAttemptAt" TIMESTAMP(3),
  ADD COLUMN "deletionFailureCode" TEXT,
  ADD COLUMN "physicallyDeletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "vendor_onboarding_documents_storageKey_key" ON "vendor_onboarding_documents"("storageKey");

CREATE TABLE "vendor_private_uploads" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "onboardingDocumentId" UUID,
  "externalDeletionState" "StoredObjectDeletionState",
  "retentionReason" "StoredObjectRetentionReason",
  "deletionAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastDeletionAttemptAt" TIMESTAMP(3),
  "deletionFailureCode" TEXT,
  "physicallyDeletedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendor_private_uploads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vendor_private_uploads_storageKey_key" ON "vendor_private_uploads"("storageKey");
CREATE UNIQUE INDEX "vendor_private_uploads_onboardingDocumentId_key" ON "vendor_private_uploads"("onboardingDocumentId");
CREATE INDEX "vendor_private_uploads_vendorId_externalDeletionState_idx" ON "vendor_private_uploads"("vendorId", "externalDeletionState");
ALTER TABLE "vendor_private_uploads" ADD CONSTRAINT "vendor_private_uploads_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_private_uploads" ADD CONSTRAINT "vendor_private_uploads_onboardingDocumentId_fkey" FOREIGN KEY ("onboardingDocumentId") REFERENCES "vendor_onboarding_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
