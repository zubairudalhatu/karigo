-- Task 72: SME Services service-provider request foundation.

CREATE TYPE "ServiceProviderType" AS ENUM (
  'PAINTER',
  'PLUMBER',
  'MECHANIC',
  'ELECTRICIAN',
  'CLEANER',
  'CARPENTER',
  'AC_TECHNICIAN',
  'GENERATOR_REPAIR',
  'HEALTH_PROFESSIONAL',
  'OTHER'
);

CREATE TYPE "ServiceProviderRequestStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'PROVIDER_MATCHING',
  'PROVIDER_ASSIGNED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "service_provider_requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceType" "ServiceProviderType" NOT NULL,
    "serviceLabel" TEXT NOT NULL,
    "serviceAddressId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "preferredDate" TEXT,
    "preferredTimeWindow" TEXT,
    "customerNote" TEXT,
    "status" "ServiceProviderRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "readinessOnly" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_provider_requests_requestNumber_key" ON "service_provider_requests"("requestNumber");
CREATE INDEX "service_provider_requests_customerId_createdAt_idx" ON "service_provider_requests"("customerId", "createdAt");
CREATE INDEX "service_provider_requests_serviceType_status_createdAt_idx" ON "service_provider_requests"("serviceType", "status", "createdAt");
CREATE INDEX "service_provider_requests_status_createdAt_idx" ON "service_provider_requests"("status", "createdAt");

ALTER TABLE "service_provider_requests" ADD CONSTRAINT "service_provider_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_provider_requests" ADD CONSTRAINT "service_provider_requests_serviceAddressId_fkey" FOREIGN KEY ("serviceAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
