-- Add soft-trash metadata for vendor/partner applications.
ALTER TABLE "vendor_applications"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "trashReason" TEXT,
  ADD COLUMN "trashNote" TEXT,
  ADD COLUMN "trashedByAdminId" UUID,
  ADD COLUMN "restoredAt" TIMESTAMP(3),
  ADD COLUMN "restoredByAdminId" UUID;

CREATE INDEX "vendor_applications_deletedAt_idx" ON "vendor_applications"("deletedAt");
