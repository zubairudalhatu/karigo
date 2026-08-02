-- CreateEnum
CREATE TYPE "AccountDeletionAccountType" AS ENUM ('CUSTOMER', 'CAPTAIN', 'PARTNER', 'COMPLETE_ACCOUNT');

-- CreateEnum
CREATE TYPE "AccountDeletionStatus" AS ENUM ('REQUESTED', 'BLOCKED', 'IN_REVIEW', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountDeletionBlockedReasonCode" AS ENUM ('ACTIVE_ORDER_EXISTS', 'ACTIVE_DELIVERY_EXISTS', 'ACTIVE_RIDE_EXISTS', 'OPEN_PARTNER_ORDER_EXISTS', 'PENDING_SETTLEMENT_EXISTS', 'PENDING_EARNING_EXISTS', 'ACCOUNT_SCOPE_INVALID');

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestReference" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accountType" "AccountDeletionAccountType" NOT NULL,
    "status" "AccountDeletionStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "blockedReasonCode" "AccountDeletionBlockedReasonCode",
    "blockerSummary" JSONB,
    "adminNote" TEXT,
    "adminReviewedById" UUID,
    "adminReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_deletion_requests_requestReference_key" ON "account_deletion_requests"("requestReference");

-- CreateIndex
CREATE INDEX "account_deletion_requests_userId_accountType_status_idx" ON "account_deletion_requests"("userId", "accountType", "status");

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_requestedAt_idx" ON "account_deletion_requests"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
