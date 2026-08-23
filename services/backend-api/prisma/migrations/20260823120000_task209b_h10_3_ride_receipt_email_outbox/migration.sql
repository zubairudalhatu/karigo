-- Task 209B-S1-H10.3: additive, idempotent Ride receipt email outbox.
-- Existing receipts are intentionally not backfilled, preventing historical sends.
CREATE TYPE "TaxiRideReceiptEmailStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'SENT', 'FAILED');
CREATE TYPE "TaxiRideReceiptEmailKind" AS ENUM ('AUTOMATIC', 'CUSTOMER_RESEND');

CREATE TABLE "taxi_ride_receipt_email_deliveries" (
  "id" UUID NOT NULL,
  "receiptId" UUID NOT NULL,
  "tripId" UUID NOT NULL,
  "kind" "TaxiRideReceiptEmailKind" NOT NULL DEFAULT 'AUTOMATIC',
  "dedupeKey" TEXT NOT NULL,
  "recipientEmail" TEXT,
  "status" "TaxiRideReceiptEmailStatus" NOT NULL,
  "provider" TEXT,
  "providerMessageId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "requestedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "taxi_ride_receipt_email_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxi_ride_receipt_email_deliveries_dedupeKey_key" ON "taxi_ride_receipt_email_deliveries"("dedupeKey");
CREATE INDEX "taxi_ride_receipt_email_deliveries_status_nextAttemptAt_createdAt_idx" ON "taxi_ride_receipt_email_deliveries"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "taxi_ride_receipt_email_deliveries_receiptId_createdAt_idx" ON "taxi_ride_receipt_email_deliveries"("receiptId", "createdAt");
CREATE INDEX "taxi_ride_receipt_email_deliveries_tripId_createdAt_idx" ON "taxi_ride_receipt_email_deliveries"("tripId", "createdAt");

ALTER TABLE "taxi_ride_receipt_email_deliveries" ADD CONSTRAINT "taxi_ride_receipt_email_deliveries_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "taxi_ride_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_receipt_email_deliveries" ADD CONSTRAINT "taxi_ride_receipt_email_deliveries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
