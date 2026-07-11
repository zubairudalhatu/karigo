-- Task 74: SME Services provider directory and manual assignment foundation.

CREATE TYPE "ServiceProviderStatus" AS ENUM (
  'PENDING_REVIEW',
  'APPROVED',
  'SUSPENDED',
  'INACTIVE'
);

CREATE TABLE "service_providers" (
    "id" UUID NOT NULL,
    "providerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "serviceType" "ServiceProviderType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "serviceAreas" JSONB,
    "status" "ServiceProviderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "readinessOnly" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "service_provider_requests" ADD COLUMN "assignedProviderId" UUID;
ALTER TABLE "service_provider_requests" ADD COLUMN "assignedByAdminId" UUID;
ALTER TABLE "service_provider_requests" ADD COLUMN "assignmentNote" TEXT;
ALTER TABLE "service_provider_requests" ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "service_providers_providerCode_key" ON "service_providers"("providerCode");
CREATE INDEX "service_providers_serviceType_status_idx" ON "service_providers"("serviceType", "status");
CREATE INDEX "service_providers_city_state_idx" ON "service_providers"("city", "state");
CREATE INDEX "service_providers_phoneNumber_idx" ON "service_providers"("phoneNumber");
CREATE INDEX "service_provider_requests_assignedProviderId_status_idx" ON "service_provider_requests"("assignedProviderId", "status");

ALTER TABLE "service_provider_requests" ADD CONSTRAINT "service_provider_requests_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_provider_requests" ADD CONSTRAINT "service_provider_requests_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
