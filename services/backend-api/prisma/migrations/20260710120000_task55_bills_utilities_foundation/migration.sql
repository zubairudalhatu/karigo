-- Task 55: Bills and utilities technical foundation.

CREATE TYPE "UtilityServiceType" AS ENUM ('AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV');

CREATE TYPE "UtilityTransactionStatus" AS ENUM ('DRAFT', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

CREATE TABLE "utility_providers" (
    "id" UUID NOT NULL,
    "type" "UtilityServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "utility_products" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "type" "UtilityServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amountKobo" INTEGER,
    "minAmountKobo" INTEGER,
    "maxAmountKobo" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "utility_transactions" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceType" "UtilityServiceType" NOT NULL,
    "providerId" UUID NOT NULL,
    "productId" UUID,
    "amountKobo" INTEGER NOT NULL,
    "convenienceFeeKobo" INTEGER NOT NULL DEFAULT 0,
    "totalKobo" INTEGER NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientName" TEXT,
    "status" "UtilityTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "providerStatus" TEXT,
    "providerReference" TEXT,
    "mockToken" TEXT,
    "customerNote" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "utility_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "utility_providers_code_key" ON "utility_providers"("code");
CREATE INDEX "utility_providers_type_isActive_idx" ON "utility_providers"("type", "isActive");

CREATE UNIQUE INDEX "utility_products_code_key" ON "utility_products"("code");
CREATE INDEX "utility_products_providerId_type_isActive_idx" ON "utility_products"("providerId", "type", "isActive");

CREATE UNIQUE INDEX "utility_transactions_reference_key" ON "utility_transactions"("reference");
CREATE INDEX "utility_transactions_customerId_createdAt_idx" ON "utility_transactions"("customerId", "createdAt");
CREATE INDEX "utility_transactions_serviceType_status_createdAt_idx" ON "utility_transactions"("serviceType", "status", "createdAt");
CREATE INDEX "utility_transactions_providerId_createdAt_idx" ON "utility_transactions"("providerId", "createdAt");

ALTER TABLE "utility_products" ADD CONSTRAINT "utility_products_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "utility_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "utility_transactions" ADD CONSTRAINT "utility_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "utility_transactions" ADD CONSTRAINT "utility_transactions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "utility_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "utility_transactions" ADD CONSTRAINT "utility_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "utility_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
