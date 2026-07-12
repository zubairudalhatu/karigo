CREATE TYPE "WalletStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'CLOSED'
);

CREATE TYPE "WalletLedgerEntryType" AS ENUM (
  'TOP_UP',
  'REFUND',
  'ADMIN_ADJUSTMENT',
  'ORDER_PAYMENT',
  'SERVICE_PAYMENT',
  'REVERSAL',
  'REFERRAL_REWARD'
);

CREATE TYPE "WalletLedgerDirection" AS ENUM (
  'CREDIT',
  'DEBIT'
);

CREATE TYPE "WalletLedgerEntryStatus" AS ENUM (
  'PENDING',
  'POSTED',
  'REVERSED',
  'CANCELLED',
  'FAILED'
);

CREATE TABLE "customer_wallets" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ledgerBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastActivityAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_wallet_ledger_entries" (
  "id" UUID NOT NULL,
  "walletId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "entryType" "WalletLedgerEntryType" NOT NULL,
  "direction" "WalletLedgerDirection" NOT NULL,
  "status" "WalletLedgerEntryStatus" NOT NULL DEFAULT 'POSTED',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "balanceBefore" DECIMAL(12,2) NOT NULL,
  "balanceAfter" DECIMAL(12,2) NOT NULL,
  "reference" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "createdByAdminId" UUID,
  "postedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_wallets_customerId_key" ON "customer_wallets"("customerId");
CREATE INDEX "customer_wallets_status_idx" ON "customer_wallets"("status");
CREATE UNIQUE INDEX "customer_wallet_ledger_entries_reference_key" ON "customer_wallet_ledger_entries"("reference");
CREATE UNIQUE INDEX "customer_wallet_ledger_entries_idempotencyKey_key" ON "customer_wallet_ledger_entries"("idempotencyKey");
CREATE INDEX "customer_wallet_ledger_entries_customerId_createdAt_idx" ON "customer_wallet_ledger_entries"("customerId", "createdAt");
CREATE INDEX "customer_wallet_ledger_entries_walletId_createdAt_idx" ON "customer_wallet_ledger_entries"("walletId", "createdAt");
CREATE INDEX "customer_wallet_ledger_entries_entryType_status_idx" ON "customer_wallet_ledger_entries"("entryType", "status");
CREATE INDEX "customer_wallet_ledger_entries_sourceType_sourceId_idx" ON "customer_wallet_ledger_entries"("sourceType", "sourceId");

ALTER TABLE "customer_wallets" ADD CONSTRAINT "customer_wallets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_wallet_ledger_entries" ADD CONSTRAINT "customer_wallet_ledger_entries_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "customer_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_wallet_ledger_entries" ADD CONSTRAINT "customer_wallet_ledger_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_wallet_ledger_entries" ADD CONSTRAINT "customer_wallet_ledger_entries_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
