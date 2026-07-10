-- Task 56: Taxi readiness architecture, driver applications and customer waitlist.

CREATE TYPE "TaxiApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'PROVISIONALLY_APPROVED', 'APPROVED', 'REJECTED');

CREATE TYPE "TaxiWaitlistStatus" AS ENUM ('SUBMITTED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'CONVERTED');

CREATE TYPE "TaxiVehicleType" AS ENUM ('SEDAN', 'SUV', 'MINI_BUS', 'TRICYCLE', 'OTHER');

CREATE TYPE "TaxiVehicleOwnership" AS ENUM ('OWNER', 'LEASED', 'COMPANY_ASSIGNED', 'OTHER');

CREATE TABLE "taxi_driver_applications" (
    "id" UUID NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "applicantUserId" UUID,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "address" TEXT,
    "driverLicenceNumber" TEXT,
    "driverLicenceExpiry" TIMESTAMP(3),
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "vehicleColour" TEXT,
    "vehiclePlateNumber" TEXT,
    "vehicleType" "TaxiVehicleType",
    "vehicleOwnership" "TaxiVehicleOwnership",
    "notes" TEXT,
    "status" "TaxiApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "adminNote" TEXT,
    "applicantVisibleNote" TEXT,
    "reviewedByAdminId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxi_driver_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taxi_waitlist_entries" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pickupArea" TEXT,
    "note" TEXT,
    "status" "TaxiWaitlistStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxi_waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "taxi_driver_applications_applicationReference_key" ON "taxi_driver_applications"("applicationReference");
CREATE INDEX "taxi_driver_applications_status_createdAt_idx" ON "taxi_driver_applications"("status", "createdAt");
CREATE INDEX "taxi_driver_applications_phoneNumber_idx" ON "taxi_driver_applications"("phoneNumber");
CREATE INDEX "taxi_driver_applications_city_state_idx" ON "taxi_driver_applications"("city", "state");

CREATE INDEX "taxi_waitlist_entries_status_createdAt_idx" ON "taxi_waitlist_entries"("status", "createdAt");
CREATE INDEX "taxi_waitlist_entries_phoneNumber_idx" ON "taxi_waitlist_entries"("phoneNumber");
CREATE INDEX "taxi_waitlist_entries_city_state_idx" ON "taxi_waitlist_entries"("city", "state");

ALTER TABLE "taxi_driver_applications" ADD CONSTRAINT "taxi_driver_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taxi_driver_applications" ADD CONSTRAINT "taxi_driver_applications_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
