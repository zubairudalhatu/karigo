-- H11.1 adds provider-verified Captain commission payment intents without rewriting H11 history.
-- Existing controlled-QA remittances remain classified as MANUAL_OVERRIDE by the additive default.
CREATE TYPE "TaxiRideCommissionRemittanceSource" AS ENUM ('MANUAL_OVERRIDE', 'PROVIDER_VERIFIED');
CREATE TYPE "TaxiRideCommissionPaymentPurpose" AS ENUM ('RIDE_COMMISSION_REMITTANCE');
CREATE TYPE "TaxiRideCommissionPaymentStatus" AS ENUM ('PENDING', 'INITIALIZED', 'SUCCESSFUL', 'FAILED', 'VERIFICATION_FAILED', 'REVIEW_REQUIRED', 'EXPIRED', 'CANCELLED');

ALTER TABLE "taxi_ride_commission_remittances"
ADD COLUMN "source" "TaxiRideCommissionRemittanceSource" NOT NULL DEFAULT 'MANUAL_OVERRIDE';

CREATE TABLE "taxi_ride_commission_payments" (
  "id" UUID NOT NULL,
  "driverProfileId" UUID NOT NULL,
  "purpose" "TaxiRideCommissionPaymentPurpose" NOT NULL DEFAULT 'RIDE_COMMISSION_REMITTANCE',
  "provider" TEXT NOT NULL,
  "transactionReference" TEXT NOT NULL,
  "providerTransactionReference" TEXT,
  "amountKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "TaxiRideCommissionPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "remittanceId" UUID,
  "failureReason" TEXT,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "initializedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "taxi_ride_commission_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_commission_payments_amount_positive" CHECK ("amountKobo" > 0),
  CONSTRAINT "taxi_ride_commission_payments_currency_ngn" CHECK ("currency" = 'NGN')
);

CREATE UNIQUE INDEX "taxi_ride_commission_payments_transactionReference_key" ON "taxi_ride_commission_payments"("transactionReference");
CREATE UNIQUE INDEX "taxi_ride_commission_payments_providerTransactionReference_key" ON "taxi_ride_commission_payments"("providerTransactionReference");
CREATE UNIQUE INDEX "taxi_ride_commission_payments_remittanceId_key" ON "taxi_ride_commission_payments"("remittanceId");
CREATE INDEX "taxi_ride_commission_payments_driverProfileId_createdAt_idx" ON "taxi_ride_commission_payments"("driverProfileId", "createdAt");
CREATE INDEX "taxi_ride_commission_payments_status_createdAt_idx" ON "taxi_ride_commission_payments"("status", "createdAt");
CREATE INDEX "taxi_ride_commission_payments_provider_status_createdAt_idx" ON "taxi_ride_commission_payments"("provider", "status", "createdAt");

ALTER TABLE "taxi_ride_commission_payments" ADD CONSTRAINT "taxi_ride_commission_payments_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "taxi_driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_commission_payments" ADD CONSTRAINT "taxi_ride_commission_payments_remittanceId_fkey" FOREIGN KEY ("remittanceId") REFERENCES "taxi_ride_commission_remittances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
