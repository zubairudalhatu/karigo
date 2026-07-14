-- Task 123: Customer profile photo support and expanded SME Services categories.

ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'APPLIANCE_REPAIR';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'FUMIGATION';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'WELDER';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'TILER';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'CCTV_TECHNICIAN';
ALTER TYPE "ServiceProviderType" ADD VALUE IF NOT EXISTS 'MOVING_HELP';

ALTER TABLE "users" ADD COLUMN "profilePhotoUrl" TEXT;
