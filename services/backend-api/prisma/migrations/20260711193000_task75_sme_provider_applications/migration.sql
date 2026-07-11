-- Task 75: SME Services public provider application flow.

CREATE TYPE "ServiceProviderApplicationStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'CONVERTED_TO_PROVIDER'
);

CREATE TABLE "service_provider_applications" (
    "id" UUID NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "serviceType" "ServiceProviderType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "serviceAreas" JSONB,
    "address" TEXT,
    "experienceSummary" TEXT,
    "toolsOrEquipment" TEXT,
    "availability" TEXT,
    "identificationType" TEXT,
    "identificationNumber" TEXT,
    "status" "ServiceProviderApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_applications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "service_providers" ADD COLUMN "sourceApplicationId" UUID;

CREATE UNIQUE INDEX "service_provider_applications_applicationReference_key" ON "service_provider_applications"("applicationReference");
CREATE UNIQUE INDEX "service_providers_sourceApplicationId_key" ON "service_providers"("sourceApplicationId");
CREATE INDEX "service_provider_applications_status_submittedAt_idx" ON "service_provider_applications"("status", "submittedAt");
CREATE INDEX "service_provider_applications_serviceType_status_idx" ON "service_provider_applications"("serviceType", "status");
CREATE INDEX "service_provider_applications_city_state_idx" ON "service_provider_applications"("city", "state");
CREATE INDEX "service_provider_applications_phoneNumber_idx" ON "service_provider_applications"("phoneNumber");

ALTER TABLE "service_provider_applications" ADD CONSTRAINT "service_provider_applications_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "service_provider_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;