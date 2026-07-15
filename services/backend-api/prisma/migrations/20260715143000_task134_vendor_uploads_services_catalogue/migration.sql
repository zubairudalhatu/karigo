-- Task 134: vendor upload support and internal vendor service catalogue.

CREATE TYPE "VendorServiceStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
);

CREATE TABLE "vendor_services" (
  "id" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "serviceType" "ServiceProviderType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "basePrice" DECIMAL(12,2),
  "priceNote" TEXT,
  "durationEstimate" TEXT,
  "serviceAreas" JSONB,
  "imageUrl" TEXT,
  "status" "VendorServiceStatus" NOT NULL DEFAULT 'ACTIVE',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "readinessOnly" BOOLEAN NOT NULL DEFAULT false,
  "internalNote" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vendor_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vendor_services_vendorId_status_isAvailable_idx" ON "vendor_services"("vendorId", "status", "isAvailable");
CREATE INDEX "vendor_services_serviceType_status_idx" ON "vendor_services"("serviceType", "status");

ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
