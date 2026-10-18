-- Additive only. Historical locations remain UNKNOWN; no backfill or erasure.
ALTER TABLE "taxi_trips"
 ADD COLUMN "pickupContentSource" TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
 ADD COLUMN "destinationContentSource" TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
 ADD COLUMN "pickupGoogleExpiresAt" TIMESTAMP(3),
 ADD COLUMN "destinationGoogleExpiresAt" TIMESTAMP(3),
 ADD COLUMN "stopContentSource" TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN',
 ADD COLUMN "stopLatitude" DECIMAL(10,7),
 ADD COLUMN "stopLongitude" DECIMAL(10,7),
 ADD COLUMN "stopGoogleExpiresAt" TIMESTAMP(3);
CREATE INDEX "taxi_trips_pickupGoogleExpiresAt_idx" ON "taxi_trips" ("pickupGoogleExpiresAt");
CREATE INDEX "taxi_trips_destinationGoogleExpiresAt_idx" ON "taxi_trips" ("destinationGoogleExpiresAt");
CREATE INDEX "taxi_trips_stopGoogleExpiresAt_idx" ON "taxi_trips" ("stopGoogleExpiresAt");
ALTER TABLE "addresses" ADD COLUMN "contentSource" TEXT NOT NULL DEFAULT 'LEGACY_UNKNOWN';
