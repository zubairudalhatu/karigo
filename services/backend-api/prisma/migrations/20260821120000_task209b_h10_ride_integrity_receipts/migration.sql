CREATE TABLE "taxi_ride_trace_points" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "clientPointId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracyMeters" DECIMAL(8,2),
    "speedMetersPerSecond" DECIMAL(8,2),
    "headingDegrees" DECIMAL(6,2),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'FOREGROUND',
    CONSTRAINT "taxi_ride_trace_points_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxi_ride_receipts" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "pickupAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "city" TEXT,
    "rideCategory" TEXT NOT NULL,
    "captainName" TEXT,
    "vehicleDescription" TEXT,
    "vehiclePlateNumber" TEXT,
    "plannedDistanceKm" DECIMAL(8,2),
    "actualDistanceKm" DECIMAL(8,2),
    "durationSeconds" INTEGER,
    "rideFareKobo" INTEGER NOT NULL,
    "minimumFareApplied" BOOLEAN NOT NULL DEFAULT false,
    "totalWaitingSeconds" INTEGER NOT NULL DEFAULT 0,
    "freeWaitingSeconds" INTEGER NOT NULL DEFAULT 0,
    "billableWaitingSeconds" INTEGER NOT NULL DEFAULT 0,
    "waitingChargeKobo" INTEGER NOT NULL DEFAULT 0,
    "platformFeeKobo" INTEGER NOT NULL DEFAULT 0,
    "discountKobo" INTEGER NOT NULL DEFAULT 0,
    "totalFareKobo" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "taxi_ride_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxi_ride_trace_points_tripId_clientPointId_key" ON "taxi_ride_trace_points"("tripId", "clientPointId");
CREATE INDEX "taxi_ride_trace_points_tripId_recordedAt_idx" ON "taxi_ride_trace_points"("tripId", "recordedAt");
CREATE UNIQUE INDEX "taxi_ride_receipts_tripId_key" ON "taxi_ride_receipts"("tripId");
CREATE UNIQUE INDEX "taxi_ride_receipts_receiptNumber_key" ON "taxi_ride_receipts"("receiptNumber");
CREATE INDEX "taxi_ride_receipts_completedAt_idx" ON "taxi_ride_receipts"("completedAt");

ALTER TABLE "taxi_ride_trace_points" ADD CONSTRAINT "taxi_ride_trace_points_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "taxi_ride_receipts" ADD CONSTRAINT "taxi_ride_receipts_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
