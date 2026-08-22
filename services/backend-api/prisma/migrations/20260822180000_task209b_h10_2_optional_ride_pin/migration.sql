-- Task 209B-S1-H10.2: additive Customer Ride PIN preference and immutable Ride snapshot.
ALTER TABLE "customer_profiles"
ADD COLUMN "requireRidePin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "taxi_trips"
ADD COLUMN "ridePinRequired" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the secure requirement on pre-H10.2 Rides that already contain
-- authoritative PIN material or PIN audit evidence. New Rides snapshot the
-- Customer preference explicitly and continue to default to false.
UPDATE "taxi_trips" AS trip
SET "ridePinRequired" = true
WHERE trip."tripPinHash" IS NOT NULL
   OR trip."tripPinEncrypted" IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM "taxi_trip_events" AS event
     WHERE event."tripId" = trip."id" AND event."eventType" IN ('RIDE_PIN_ISSUED', 'RIDE_PIN_VERIFIED_AND_TRIP_STARTED')
   );
