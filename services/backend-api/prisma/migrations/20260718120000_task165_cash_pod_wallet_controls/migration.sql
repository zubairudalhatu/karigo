-- Task 165: persisted Cash/POD, wallet top-up and wallet payment controls.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CASH_PENDING';

DO $$ BEGIN
  CREATE TYPE "OrderPaymentMethod" AS ENUM ('SQUAD', 'WALLET', 'CASH_ON_DELIVERY', 'MOCK', 'MONNIFY', 'PAYSTACK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CashCollectionStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_COLLECTION', 'COLLECTED', 'RECONCILED', 'DISPUTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentPurpose" AS ENUM ('ORDER_PAYMENT', 'WALLET_TOP_UP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "OrderPaymentMethod",
  ADD COLUMN IF NOT EXISTS "cashCollectionStatus" "CashCollectionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS "cashCollectedAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "cashCollectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cashCollectedByRiderId" UUID,
  ADD COLUMN IF NOT EXISTS "cashReconciledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cashReconciledByAdminId" UUID,
  ADD COLUMN IF NOT EXISTS "cashReconciliationNote" TEXT;

ALTER TABLE "payments"
  ALTER COLUMN "orderId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "paymentPurpose" "PaymentPurpose" NOT NULL DEFAULT 'ORDER_PAYMENT',
  ADD COLUMN IF NOT EXISTS "walletLedgerEntryId" UUID;

CREATE INDEX IF NOT EXISTS "orders_paymentMethod_paymentStatus_idx" ON "orders"("paymentMethod", "paymentStatus");
CREATE INDEX IF NOT EXISTS "orders_cashCollectionStatus_createdAt_idx" ON "orders"("cashCollectionStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "payments_paymentPurpose_paymentStatus_idx" ON "payments"("paymentPurpose", "paymentStatus");
CREATE INDEX IF NOT EXISTS "payments_walletLedgerEntryId_idx" ON "payments"("walletLedgerEntryId");
