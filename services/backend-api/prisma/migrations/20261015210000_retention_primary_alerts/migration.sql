-- Additive operational state only. No existing Customer/financial tables changed.
CREATE TABLE "RetentionAlertState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RetentionAlertReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RetentionAlertReport_createdAt_idx" ON "RetentionAlertReport"("createdAt");
