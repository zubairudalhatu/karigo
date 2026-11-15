-- CreateEnum
CREATE TYPE "OrderAttemptState" AS ENUM ('CREATING', 'READY', 'PENDING', 'UNKNOWN', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REVIEW_REQUIRED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderRefundState" AS ENUM ('REQUESTED', 'ACCEPTED', 'PENDING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "order_payment_attempts" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "environment" VARCHAR(16) NOT NULL,
    "merchantAccountId" VARCHAR(100) NOT NULL,
    "transactionReference" VARCHAR(200) NOT NULL,
    "providerTransactionReference" VARCHAR(200),
    "idempotencyKeyHash" VARCHAR(64) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "state" "OrderAttemptState" NOT NULL DEFAULT 'CREATING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "authorizationUrl" VARCHAR(2048),
    "providerStatus" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_claims" (
    "orderId" UUID NOT NULL,
    "activeAttemptId" UUID,
    "successfulAttemptId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payment_claims_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "order_payment_provider_events" (
    "id" UUID NOT NULL,
    "attemptId" UUID,
    "provider" VARCHAR(40) NOT NULL,
    "environment" VARCHAR(16) NOT NULL,
    "merchantAccountId" VARCHAR(100) NOT NULL,
    "eventKey" VARCHAR(64) NOT NULL,
    "bodyDigest" VARCHAR(64) NOT NULL,
    "reference" VARCHAR(200),
    "eventType" VARCHAR(80) NOT NULL,
    "state" VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
    "reasonCode" VARCHAR(64),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "order_payment_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_refunds" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "idempotencyKeyHash" VARCHAR(64) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "state" "OrderRefundState" NOT NULL DEFAULT 'REQUESTED',
    "providerReference" VARCHAR(200),
    "providerStatus" VARCHAR(40),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_discrepancies" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "evidenceDigest" VARCHAR(64) NOT NULL,
    "state" VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payment_discrepancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_audit" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "stage" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL,
    "reasonCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payment_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_attempts_paymentId_key" ON "order_payment_attempts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_attempts_transactionReference_key" ON "order_payment_attempts"("transactionReference");

-- CreateIndex
CREATE INDEX "order_payment_attempts_orderId_state_idx" ON "order_payment_attempts"("orderId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_attempts_customerId_idempotencyKeyHash_key" ON "order_payment_attempts"("customerId", "idempotencyKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "order_attempt_provider_reference_key" ON "order_payment_attempts"("provider", "environment", "merchantAccountId", "providerTransactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_claims_activeAttemptId_key" ON "order_payment_claims"("activeAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_claims_successfulAttemptId_key" ON "order_payment_claims"("successfulAttemptId");

-- CreateIndex
CREATE INDEX "order_payment_provider_events_state_receivedAt_idx" ON "order_payment_provider_events"("state", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_provider_event_identity_key" ON "order_payment_provider_events"("provider", "environment", "merchantAccountId", "eventKey");

-- CreateIndex
CREATE INDEX "order_payment_refunds_attemptId_state_idx" ON "order_payment_refunds"("attemptId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_refunds_attemptId_idempotencyKeyHash_key" ON "order_payment_refunds"("attemptId", "idempotencyKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_discrepancies_attemptId_kind_evidenceDigest_key" ON "order_payment_discrepancies"("attemptId", "kind", "evidenceDigest");

-- CreateIndex
CREATE INDEX "order_payment_audit_attemptId_createdAt_idx" ON "order_payment_audit"("attemptId", "createdAt");

-- AddForeignKey
ALTER TABLE "order_payment_attempts" ADD CONSTRAINT "order_payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_provider_events" ADD CONSTRAINT "order_payment_provider_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "order_payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_refunds" ADD CONSTRAINT "order_payment_refunds_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "order_payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_discrepancies" ADD CONSTRAINT "order_payment_discrepancies_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "order_payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_audit" ADD CONSTRAINT "order_payment_audit_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "order_payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

