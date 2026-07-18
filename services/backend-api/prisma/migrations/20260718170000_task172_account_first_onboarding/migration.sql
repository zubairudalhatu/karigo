-- Task 172: account-first Vendor, Delivery Captain and Ride Captain onboarding links.

ALTER TABLE "users" ADD COLUMN "onboardingPasswordSetAt" TIMESTAMP(3);

ALTER TABLE "vendor_applications" ADD COLUMN "applicantUserId" UUID;
ALTER TABLE "delivery_captain_applications" ADD COLUMN "applicantUserId" UUID;
ALTER TABLE "delivery_captain_applications" ADD COLUMN "driverLicenceNumber" TEXT;

ALTER TABLE "taxi_driver_applications" ADD COLUMN "driverLicenceDocumentUrl" TEXT;
ALTER TABLE "taxi_driver_applications" ADD COLUMN "vehicleParticularsDocumentUrl" TEXT;
ALTER TABLE "taxi_driver_applications" ADD COLUMN "insuranceDocumentUrl" TEXT;

CREATE INDEX "vendor_applications_applicantUserId_idx" ON "vendor_applications"("applicantUserId");
CREATE INDEX "delivery_captain_applications_applicantUserId_idx" ON "delivery_captain_applications"("applicantUserId");

ALTER TABLE "vendor_applications" ADD CONSTRAINT "vendor_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_captain_applications" ADD CONSTRAINT "delivery_captain_applications_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
