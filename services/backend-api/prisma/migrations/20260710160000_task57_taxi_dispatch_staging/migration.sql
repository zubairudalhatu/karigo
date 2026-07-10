-- Task 57: Taxi dispatch staging infrastructure, test trips, driver profiles and trip events.

CREATE TYPE "TaxiDriverProfileStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE_TEST', 'SUSPENDED', 'DEACTIVATED');

CREATE TYPE "TaxiTripStatus" AS ENUM ('REQUESTED', 'DRIVER_ASSIGNED', 'ACCEPTED', 'ARRIVED_PICKUP', 'STARTED', 'ARRIVED_DESTINATION', 'COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_ADMIN', 'EXPIRED');

CREATE TYPE "TaxiTripActorType" AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN', 'SYSTEM');

CREATE TABLE "taxi_driver_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "applicationId" UUID,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "vehicleColour" TEXT,
    "vehiclePlateNumber" TEXT,
    "vehicleType" "TaxiVehicleType",
    "status" "TaxiDriverProfileStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "isAvailableForTaxi" BOOLEAN NOT NULL DEFAULT false,
    "lastKnownLatitude" DECIMAL(10,7),
    "lastKnownLongitude" DECIMAL(10,7),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxi_driver_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxi_trips" (
    "id" UUID NOT NULL,
    "tripReference" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "driverProfileId" UUID,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DECIMAL(10,7),
    "pickupLongitude" DECIMAL(10,7),
    "destinationAddress" TEXT NOT NULL,
    "destinationLatitude" DECIMAL(10,7),
    "destinationLongitude" DECIMAL(10,7),
    "estimatedDistanceKm" DECIMAL(8,2),
    "estimatedDurationMin" INTEGER,
    "estimatedFareKobo" INTEGER NOT NULL,
    "finalFareKobo" INTEGER,
    "status" "TaxiTripStatus" NOT NULL DEFAULT 'REQUESTED',
    "tripPinHash" TEXT,
    "tripPinLastFour" TEXT,
    "cancellationReason" TEXT,
    "customerNote" TEXT,
    "driverNote" TEXT,
    "isTestMode" BOOLEAN NOT NULL DEFAULT true,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "arrivedAtPickupAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "arrivedAtDestinationAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxi_trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxi_trip_events" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "actorType" "TaxiTripActorType" NOT NULL,
    "actorId" UUID,
    "eventType" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxi_trip_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxi_driver_profiles_userId_key" ON "taxi_driver_profiles"("userId");
CREATE UNIQUE INDEX "taxi_driver_profiles_applicationId_key" ON "taxi_driver_profiles"("applicationId");
CREATE INDEX "taxi_driver_profiles_status_isAvailableForTaxi_idx" ON "taxi_driver_profiles"("status", "isAvailableForTaxi");
CREATE INDEX "taxi_driver_profiles_city_state_idx" ON "taxi_driver_profiles"("city", "state");
CREATE INDEX "taxi_driver_profiles_phoneNumber_idx" ON "taxi_driver_profiles"("phoneNumber");

CREATE UNIQUE INDEX "taxi_trips_tripReference_key" ON "taxi_trips"("tripReference");
CREATE INDEX "taxi_trips_customerId_createdAt_idx" ON "taxi_trips"("customerId", "createdAt");
CREATE INDEX "taxi_trips_driverProfileId_status_idx" ON "taxi_trips"("driverProfileId", "status");
CREATE INDEX "taxi_trips_status_createdAt_idx" ON "taxi_trips"("status", "createdAt");

CREATE INDEX "taxi_trip_events_tripId_createdAt_idx" ON "taxi_trip_events"("tripId", "createdAt");
CREATE INDEX "taxi_trip_events_actorType_createdAt_idx" ON "taxi_trip_events"("actorType", "createdAt");

ALTER TABLE "taxi_driver_profiles" ADD CONSTRAINT "taxi_driver_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_driver_profiles" ADD CONSTRAINT "taxi_driver_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "taxi_driver_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_trips" ADD CONSTRAINT "taxi_trips_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_trips" ADD CONSTRAINT "taxi_trips_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "taxi_driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_trip_events" ADD CONSTRAINT "taxi_trip_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
