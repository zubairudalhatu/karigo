-- Task 209B-S1-H11: additive Ride financial truth, ledger, reconciliation, and Cash refund foundation.
-- Existing completed Rides are intentionally not backfilled by this migration.
CREATE TYPE "TaxiRideSettlementDirection" AS ENUM ('CAPTAIN_TO_PLATFORM', 'PLATFORM_TO_CAPTAIN', 'NONE');
CREATE TYPE "TaxiRideSettlementStatus" AS ENUM ('PENDING', 'PARTIALLY_RECONCILED', 'RECONCILED', 'DISPUTED', 'REFUND_PENDING', 'CANCELLED');
CREATE TYPE "TaxiRideFinancialOutcome" AS ENUM ('NORMAL_COMPLETION', 'ZERO_VALUE_CANCELLATION', 'FINANCIAL_REVIEW_REQUIRED');
CREATE TYPE "TaxiRideLedgerEntryType" AS ENUM ('RIDE_FARE_FINALIZED', 'CAPTAIN_EARNING_CREATED', 'KARIGO_COMMISSION_CREATED', 'CASH_COLLECTED', 'COMMISSION_REMITTANCE', 'REFUND_APPROVED', 'REFUND_SETTLED', 'CREDIT', 'DEBIT_ADJUSTMENT', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'ZERO_VALUE_CANCELLATION');
CREATE TYPE "TaxiRideLedgerDirection" AS ENUM ('PLATFORM_RECEIVABLE_INCREASE', 'PLATFORM_RECEIVABLE_DECREASE', 'CAPTAIN_EARNING_INCREASE', 'CAPTAIN_EARNING_DECREASE', 'CASH_POSITION', 'CUSTOMER_REFUND_OBLIGATION', 'NONE');
CREATE TYPE "TaxiRideRefundStatus" AS ENUM ('CASH_REFUND_DUE', 'CASH_REFUND_SETTLED');
CREATE TYPE "TaxiRideFinancialResponsibility" AS ENUM ('PLATFORM', 'CAPTAIN', 'SHARED', 'REVIEW_REQUIRED');
CREATE TYPE "TaxiRideAdjustmentDirection" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "TaxiRideFinancialBalanceTarget" AS ENUM ('PLATFORM_RECEIVABLE', 'CAPTAIN_EARNING');

CREATE TABLE "taxi_ride_settlements" (
  "id" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "driverProfileId" UUID,
  "customerId" UUID NOT NULL,
  "tripReference" TEXT NOT NULL,
  "captainName" TEXT,
  "serviceArea" TEXT,
  "rideCategory" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
  "financialOutcome" "TaxiRideFinancialOutcome" NOT NULL DEFAULT 'NORMAL_COMPLETION',
  "grossFareKobo" INTEGER NOT NULL,
  "rideFareKobo" INTEGER NOT NULL,
  "waitingChargeKobo" INTEGER NOT NULL DEFAULT 0,
  "discountKobo" INTEGER NOT NULL DEFAULT 0,
  "finalCustomerFareKobo" INTEGER NOT NULL,
  "commissionRateBasisPoints" INTEGER NOT NULL,
  "karigoCommissionKobo" INTEGER NOT NULL,
  "captainGrossEarningKobo" INTEGER NOT NULL,
  "captainNetEarningKobo" INTEGER NOT NULL,
  "cashCollectedKobo" INTEGER NOT NULL DEFAULT 0,
  "platformReceivableKobo" INTEGER NOT NULL DEFAULT 0,
  "captainReceivableKobo" INTEGER NOT NULL DEFAULT 0,
  "remittedKobo" INTEGER NOT NULL DEFAULT 0,
  "refundedKobo" INTEGER NOT NULL DEFAULT 0,
  "platformAdjustmentKobo" INTEGER NOT NULL DEFAULT 0,
  "captainAdjustmentKobo" INTEGER NOT NULL DEFAULT 0,
  "settlementDirection" "TaxiRideSettlementDirection" NOT NULL,
  "status" "TaxiRideSettlementStatus" NOT NULL DEFAULT 'PENDING',
  "disputeReason" TEXT,
  "disputeOpenedAt" TIMESTAMP(3),
  "disputeResolvedAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "reconciliationReference" TEXT,
  "reconciliationNote" TEXT,
  "finalizedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "taxi_ride_settlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_settlements_money_nonnegative" CHECK ("grossFareKobo" >= 0 AND "rideFareKobo" >= 0 AND "waitingChargeKobo" >= 0 AND "discountKobo" >= 0 AND "finalCustomerFareKobo" >= 0 AND "karigoCommissionKobo" >= 0 AND "captainGrossEarningKobo" >= 0 AND "captainNetEarningKobo" >= 0 AND "cashCollectedKobo" >= 0 AND "platformReceivableKobo" >= 0 AND "captainReceivableKobo" >= 0 AND "remittedKobo" >= 0 AND "refundedKobo" >= 0),
  CONSTRAINT "taxi_ride_settlements_commission_rate_valid" CHECK ("commissionRateBasisPoints" >= 0 AND "commissionRateBasisPoints" <= 10000)
);

CREATE TABLE "taxi_ride_financial_ledger_entries" (
  "id" UUID NOT NULL,
  "settlementId" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "entryType" "TaxiRideLedgerEntryType" NOT NULL,
  "direction" "TaxiRideLedgerDirection" NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "actorUserId" UUID,
  "actorType" "TaxiTripActorType" NOT NULL,
  "reference" TEXT,
  "reason" TEXT NOT NULL,
  "financialResponsibility" "TaxiRideFinancialResponsibility",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "taxi_ride_financial_ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_financial_ledger_amount_nonnegative" CHECK ("amountKobo" >= 0)
);

CREATE TABLE "taxi_ride_commission_remittances" (
  "id" UUID NOT NULL,
  "driverProfileId" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "note" TEXT,
  "remittedAt" TIMESTAMP(3) NOT NULL,
  "recordedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "taxi_ride_commission_remittances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_commission_remittances_amount_positive" CHECK ("amountKobo" > 0)
);

CREATE TABLE "taxi_ride_commission_remittance_allocations" (
  "id" UUID NOT NULL,
  "remittanceId" UUID NOT NULL,
  "settlementId" UUID NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "taxi_ride_commission_remittance_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_commission_remittance_allocations_amount_positive" CHECK ("amountKobo" > 0)
);

CREATE TABLE "taxi_ride_refunds" (
  "id" UUID NOT NULL,
  "settlementId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "status" "TaxiRideRefundStatus" NOT NULL DEFAULT 'CASH_REFUND_DUE',
  "responsibility" "TaxiRideFinancialResponsibility" NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "platformResponsibilityKobo" INTEGER NOT NULL DEFAULT 0,
  "captainResponsibilityKobo" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "method" TEXT,
  "externalReference" TEXT,
  "note" TEXT,
  "approvedByUserId" UUID NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledByUserId" UUID,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "taxi_ride_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxi_ride_refunds_amount_positive" CHECK ("amountKobo" > 0),
  CONSTRAINT "taxi_ride_refunds_allocation_nonnegative" CHECK ("platformResponsibilityKobo" >= 0 AND "captainResponsibilityKobo" >= 0)
);

CREATE UNIQUE INDEX "taxi_ride_settlements_tripId_key" ON "taxi_ride_settlements"("tripId");
CREATE INDEX "taxi_ride_settlements_driverProfileId_finalizedAt_idx" ON "taxi_ride_settlements"("driverProfileId", "finalizedAt");
CREATE INDEX "taxi_ride_settlements_customerId_finalizedAt_idx" ON "taxi_ride_settlements"("customerId", "finalizedAt");
CREATE INDEX "taxi_ride_settlements_status_finalizedAt_idx" ON "taxi_ride_settlements"("status", "finalizedAt");
CREATE INDEX "taxi_ride_settlements_settlementDirection_status_idx" ON "taxi_ride_settlements"("settlementDirection", "status");
CREATE UNIQUE INDEX "taxi_ride_financial_ledger_entries_idempotencyKey_key" ON "taxi_ride_financial_ledger_entries"("idempotencyKey");
CREATE INDEX "taxi_ride_financial_ledger_entries_settlementId_createdAt_idx" ON "taxi_ride_financial_ledger_entries"("settlementId", "createdAt");
CREATE INDEX "taxi_ride_financial_ledger_entries_tripId_createdAt_idx" ON "taxi_ride_financial_ledger_entries"("tripId", "createdAt");
CREATE INDEX "taxi_ride_financial_ledger_entries_entryType_createdAt_idx" ON "taxi_ride_financial_ledger_entries"("entryType", "createdAt");
CREATE UNIQUE INDEX "taxi_ride_commission_remittances_reference_key" ON "taxi_ride_commission_remittances"("reference");
CREATE INDEX "taxi_ride_commission_remittances_driverProfileId_remittedAt_idx" ON "taxi_ride_commission_remittances"("driverProfileId", "remittedAt");
CREATE INDEX "taxi_ride_commission_remittances_recordedByUserId_createdAt_idx" ON "taxi_ride_commission_remittances"("recordedByUserId", "createdAt");
CREATE UNIQUE INDEX "taxi_ride_commission_remittance_allocations_remittanceId_settlementId_key" ON "taxi_ride_commission_remittance_allocations"("remittanceId", "settlementId");
CREATE INDEX "taxi_ride_commission_remittance_allocations_settlementId_createdAt_idx" ON "taxi_ride_commission_remittance_allocations"("settlementId", "createdAt");
CREATE UNIQUE INDEX "taxi_ride_refunds_idempotencyKey_key" ON "taxi_ride_refunds"("idempotencyKey");
CREATE UNIQUE INDEX "taxi_ride_refunds_externalReference_key" ON "taxi_ride_refunds"("externalReference");
CREATE INDEX "taxi_ride_refunds_settlementId_status_createdAt_idx" ON "taxi_ride_refunds"("settlementId", "status", "createdAt");
CREATE INDEX "taxi_ride_refunds_approvedByUserId_createdAt_idx" ON "taxi_ride_refunds"("approvedByUserId", "createdAt");

ALTER TABLE "taxi_ride_settlements" ADD CONSTRAINT "taxi_ride_settlements_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_settlements" ADD CONSTRAINT "taxi_ride_settlements_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "taxi_driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_settlements" ADD CONSTRAINT "taxi_ride_settlements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_financial_ledger_entries" ADD CONSTRAINT "taxi_ride_financial_ledger_entries_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "taxi_ride_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_financial_ledger_entries" ADD CONSTRAINT "taxi_ride_financial_ledger_entries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_financial_ledger_entries" ADD CONSTRAINT "taxi_ride_financial_ledger_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_commission_remittances" ADD CONSTRAINT "taxi_ride_commission_remittances_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "taxi_driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_commission_remittances" ADD CONSTRAINT "taxi_ride_commission_remittances_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_commission_remittance_allocations" ADD CONSTRAINT "taxi_ride_commission_remittance_allocations_remittanceId_fkey" FOREIGN KEY ("remittanceId") REFERENCES "taxi_ride_commission_remittances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_commission_remittance_allocations" ADD CONSTRAINT "taxi_ride_commission_remittance_allocations_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "taxi_ride_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_refunds" ADD CONSTRAINT "taxi_ride_refunds_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "taxi_ride_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_refunds" ADD CONSTRAINT "taxi_ride_refunds_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_refunds" ADD CONSTRAINT "taxi_ride_refunds_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
