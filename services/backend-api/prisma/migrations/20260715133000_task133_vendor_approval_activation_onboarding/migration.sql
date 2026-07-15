-- Task 133: vendor approval-to-activation bridge and onboarding document review.

ALTER TABLE "vendor_applications" ADD COLUMN "vendorId" UUID;

CREATE TABLE "vendor_onboarding_documents" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentName" TEXT,
  "documentUrl" TEXT NOT NULL,
  "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByAdminId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_onboarding_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_applications_vendorId_key" ON "vendor_applications"("vendorId");
CREATE INDEX "vendor_onboarding_documents_vendorId_verificationStatus_idx" ON "vendor_onboarding_documents"("vendorId", "verificationStatus");

ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_onboarding_documents" ADD CONSTRAINT "vendor_onboarding_documents_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_onboarding_documents" ADD CONSTRAINT "vendor_onboarding_documents_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
