-- Task 207A-R1: private Captain application documents, guided vehicle catalog fields,
-- and multi-area Captain onboarding metadata.

CREATE TYPE "CaptainApplicationDocumentType" AS ENUM (
  'PROFILE_PHOTO',
  'DRIVER_LICENCE',
  'VEHICLE_EXTERIOR',
  'VEHICLE_INTERIOR',
  'VEHICLE_LICENCE',
  'INSURANCE',
  'ROADWORTHINESS',
  'GUARANTOR_ID'
);

CREATE TYPE "CaptainDocumentUploadStatus" AS ENUM (
  'UPLOADED',
  'REPLACED',
  'DELETED'
);

ALTER TABLE "delivery_captain_applications"
  ADD COLUMN "residentialStateCode" TEXT,
  ADD COLUMN "residentialCityCode" TEXT,
  ADD COLUMN "operatingAreaIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "primaryOperatingAreaId" TEXT;

ALTER TABLE "taxi_driver_applications"
  ADD COLUMN "residentialStateCode" TEXT,
  ADD COLUMN "residentialCityCode" TEXT,
  ADD COLUMN "operatingAreaIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "primaryOperatingAreaId" TEXT,
  ADD COLUMN "vehicleCustomMake" TEXT,
  ADD COLUMN "vehicleCustomModel" TEXT,
  ADD COLUMN "vehicleCustomColour" TEXT;

CREATE TABLE "captain_application_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "deliveryApplicationId" UUID,
  "rideApplicationId" UUID,
  "documentType" "CaptainApplicationDocumentType" NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadStatus" "CaptainDocumentUploadStatus" NOT NULL DEFAULT 'UPLOADED',
  "reviewStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replacedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "reviewedByAdminId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "captain_application_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "captain_application_documents_objectKey_key" ON "captain_application_documents"("objectKey");
CREATE INDEX "captain_application_documents_userId_documentType_uploadStatus_idx" ON "captain_application_documents"("userId", "documentType", "uploadStatus");
CREATE INDEX "captain_application_documents_deliveryApplicationId_documentType_idx" ON "captain_application_documents"("deliveryApplicationId", "documentType");
CREATE INDEX "captain_application_documents_rideApplicationId_documentType_idx" ON "captain_application_documents"("rideApplicationId", "documentType");

ALTER TABLE "captain_application_documents"
  ADD CONSTRAINT "captain_application_documents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "captain_application_documents"
  ADD CONSTRAINT "captain_application_documents_deliveryApplicationId_fkey"
  FOREIGN KEY ("deliveryApplicationId") REFERENCES "delivery_captain_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "captain_application_documents"
  ADD CONSTRAINT "captain_application_documents_rideApplicationId_fkey"
  FOREIGN KEY ("rideApplicationId") REFERENCES "taxi_driver_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "captain_application_documents"
  ADD CONSTRAINT "captain_application_documents_reviewedByAdminId_fkey"
  FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
