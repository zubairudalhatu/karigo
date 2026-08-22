CREATE TABLE "taxi_ride_call_sessions" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "initiatorUserId" UUID NOT NULL,
    "initiatorRole" TEXT NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RINGING',
    "provider" TEXT NOT NULL DEFAULT 'AGORA',
    "providerChannel" TEXT NOT NULL,
    "providerChannelHash" TEXT NOT NULL,
    "initiatorRtcUid" INTEGER NOT NULL,
    "recipientRtcUid" INTEGER NOT NULL,
    "ringingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "missedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedByUserId" UUID,
    "endReason" TEXT,
    "durationSeconds" INTEGER,
    "lastTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "taxi_ride_call_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxi_ride_call_sessions_providerChannel_key" ON "taxi_ride_call_sessions"("providerChannel");
CREATE INDEX "taxi_ride_call_sessions_tripId_state_createdAt_idx" ON "taxi_ride_call_sessions"("tripId", "state", "createdAt");
CREATE INDEX "taxi_ride_call_sessions_recipientUserId_state_createdAt_idx" ON "taxi_ride_call_sessions"("recipientUserId", "state", "createdAt");

ALTER TABLE "taxi_ride_call_sessions" ADD CONSTRAINT "taxi_ride_call_sessions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
