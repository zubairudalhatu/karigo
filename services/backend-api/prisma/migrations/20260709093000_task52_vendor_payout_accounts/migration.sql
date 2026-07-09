-- Task 52: Vendor payout account details and admin verification readiness.

CREATE TYPE "PayoutAccountStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'NEEDS_UPDATE');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_ACCOUNT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_ACCOUNT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_ACCOUNT_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_ACCOUNT_NEEDS_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYOUT_ACCOUNT_REJECTED';

CREATE TABLE "vendor_payout_accounts" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "accountNumber" TEXT NOT NULL,
    "maskedAccountNumber" TEXT NOT NULL,
    "status" "PayoutAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByAdminId" UUID,
    "rejectionReason" TEXT,
    "vendorVisibleNote" TEXT,
    "internalNote" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_payout_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_payout_accounts_vendorId_key" ON "vendor_payout_accounts"("vendorId");
CREATE INDEX "vendor_payout_accounts_status_submittedAt_idx" ON "vendor_payout_accounts"("status", "submittedAt");

ALTER TABLE "vendor_payout_accounts" ADD CONSTRAINT "vendor_payout_accounts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_payout_accounts" ADD CONSTRAINT "vendor_payout_accounts_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
