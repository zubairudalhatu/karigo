-- Task 207B: Production KariGO Ride operations and rejected Captain application trash.

ALTER TYPE "TaxiDriverProfileStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';

ALTER TABLE "taxi_trips"
  ALTER COLUMN "isTestMode" SET DEFAULT false;

ALTER TABLE "delivery_captain_applications"
  ADD COLUMN IF NOT EXISTS "trashedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trashedByAdminId" UUID,
  ADD COLUMN IF NOT EXISTS "trashReason" TEXT,
  ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restoredByAdminId" UUID;

ALTER TABLE "taxi_driver_applications"
  ADD COLUMN IF NOT EXISTS "trashedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trashedByAdminId" UUID,
  ADD COLUMN IF NOT EXISTS "trashReason" TEXT,
  ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restoredByAdminId" UUID;

CREATE INDEX IF NOT EXISTS "delivery_captain_applications_status_trashedAt_createdAt_idx"
  ON "delivery_captain_applications"("status", "trashedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "taxi_driver_applications_status_trashedAt_createdAt_idx"
  ON "taxi_driver_applications"("status", "trashedAt", "createdAt");

DO $$ BEGIN
  CREATE TYPE "CaptainWorkMode" AS ENUM ('DELIVERY', 'RIDE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CaptainWorkLockStage" AS ENUM ('OFFERED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "captain_work_states" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "desiredDeliveryOnline" BOOLEAN NOT NULL DEFAULT false,
  "desiredRideOnline" BOOLEAN NOT NULL DEFAULT false,
  "activeWorkMode" "CaptainWorkMode",
  "activeDeliveryAssignmentId" UUID,
  "activeRideTripId" UUID,
  "lockStage" "CaptainWorkLockStage",
  "lockedAt" TIMESTAMP(3),
  "lastAvailabilityChangeAt" TIMESTAMP(3),
  "lastLocationAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "captain_work_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "captain_work_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "captain_work_states_userId_key" ON "captain_work_states"("userId");
CREATE INDEX IF NOT EXISTS "captain_work_states_activeWorkMode_lockStage_idx" ON "captain_work_states"("activeWorkMode", "lockStage");
CREATE INDEX IF NOT EXISTS "captain_work_states_desiredDeliveryOnline_desiredRideOnline_idx" ON "captain_work_states"("desiredDeliveryOnline", "desiredRideOnline");

INSERT INTO "captain_work_states" (
  "userId",
  "desiredDeliveryOnline",
  "desiredRideOnline",
  "lastAvailabilityChangeAt",
  "lastLocationAt"
)
SELECT
  "users"."id",
  COALESCE("riders"."availabilityStatus" = 'ONLINE', false),
  COALESCE("taxi_driver_profiles"."isAvailableForTaxi", false),
  CURRENT_TIMESTAMP,
  COALESCE("riders"."currentLocationUpdatedAt", "taxi_driver_profiles"."lastSeenAt")
FROM "users"
LEFT JOIN "riders" ON "riders"."userId" = "users"."id"
LEFT JOIN "taxi_driver_profiles" ON "taxi_driver_profiles"."userId" = "users"."id"
WHERE "riders"."id" IS NOT NULL OR "taxi_driver_profiles"."id" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;
