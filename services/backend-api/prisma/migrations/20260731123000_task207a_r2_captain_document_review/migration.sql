ALTER TYPE "DocumentVerificationStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

ALTER TABLE "captain_application_documents"
  ADD COLUMN IF NOT EXISTS "applicantVisibleNote" TEXT;
