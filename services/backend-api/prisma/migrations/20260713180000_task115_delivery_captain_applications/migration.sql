CREATE TYPE "DeliveryCaptainApplicationStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'PROVISIONALLY_APPROVED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "DeliveryCaptainVehicleType" AS ENUM (
  'MOTORCYCLE',
  'BICYCLE',
  'TRICYCLE',
  'CAR',
  'VAN',
  'OTHER'
);

CREATE TABLE "delivery_captain_applications" (
  "id" UUID NOT NULL,
  "applicationReference" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "email" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "preferredZone" TEXT,
  "vehicleType" "DeliveryCaptainVehicleType" NOT NULL,
  "vehiclePlateNumber" TEXT,
  "riderExperience" TEXT,
  "guarantorName" TEXT NOT NULL,
  "guarantorPhone" TEXT NOT NULL,
  "notes" TEXT,
  "status" "DeliveryCaptainApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "applicantVisibleNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_captain_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_captain_applications_applicationReference_key" ON "delivery_captain_applications"("applicationReference");
CREATE INDEX "delivery_captain_applications_status_createdAt_idx" ON "delivery_captain_applications"("status", "createdAt");
CREATE INDEX "delivery_captain_applications_phoneNumber_idx" ON "delivery_captain_applications"("phoneNumber");
CREATE INDEX "delivery_captain_applications_city_state_idx" ON "delivery_captain_applications"("city", "state");
