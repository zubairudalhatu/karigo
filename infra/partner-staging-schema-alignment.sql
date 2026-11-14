-- AlterEnum
BEGIN;
CREATE TYPE "TaxiDriverProfileStatus_new" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
ALTER TABLE "public"."taxi_driver_profiles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "taxi_driver_profiles" ALTER COLUMN "status" TYPE "TaxiDriverProfileStatus_new" USING ("status"::text::"TaxiDriverProfileStatus_new");
ALTER TYPE "TaxiDriverProfileStatus" RENAME TO "TaxiDriverProfileStatus_old";
ALTER TYPE "TaxiDriverProfileStatus_new" RENAME TO "TaxiDriverProfileStatus";
DROP TYPE "public"."TaxiDriverProfileStatus_old";
ALTER TABLE "taxi_driver_profiles" ALTER COLUMN "status" SET DEFAULT 'PENDING_ACTIVATION';
COMMIT;

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_orderId_fkey";

-- DropForeignKey
ALTER TABLE "taxi_trip_events" DROP CONSTRAINT "taxi_trip_events_tripId_fkey";

-- DropIndex
DROP INDEX "products_vendorId_isActive_isAvailable_idx";

-- AlterTable
ALTER TABLE "account_deletion_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "captain_application_documents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "captain_work_states" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "partner_onboarding_drafts" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "taxi_trip_events" ADD CONSTRAINT "taxi_trip_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "taxi_trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "captain_application_documents_deliveryApplicationId_documentTyp" RENAME TO "captain_application_documents_deliveryApplicationId_documen_idx";

-- RenameIndex
ALTER INDEX "captain_application_documents_rideApplicationId_documentType_id" RENAME TO "captain_application_documents_rideApplicationId_documentTyp_idx";

-- RenameIndex
ALTER INDEX "captain_application_documents_userId_documentType_uploadStatus_" RENAME TO "captain_application_documents_userId_documentType_uploadSta_idx";

-- RenameIndex
ALTER INDEX "delivery_captain_application_documents_applicationId_verificati" RENAME TO "delivery_captain_application_documents_applicationId_verifi_idx";

-- RenameIndex
ALTER INDEX "launch_operations_checklist_items_cityCode_serviceType_status_i" RENAME TO "launch_operations_checklist_items_cityCode_serviceType_stat_idx";

-- RenameIndex
ALTER INDEX "sme_services_pilot_launch_decisions_decisionStatus_recordedAt_i" RENAME TO "sme_services_pilot_launch_decisions_decisionStatus_recorded_idx";

-- RenameIndex
ALTER INDEX "taxi_ride_commission_remittance_allocations_remittanceId_settle" RENAME TO "taxi_ride_commission_remittance_allocations_remittanceId_se_key";

-- RenameIndex
ALTER INDEX "taxi_ride_commission_remittance_allocations_settlementId_create" RENAME TO "taxi_ride_commission_remittance_allocations_settlementId_cr_idx";

-- RenameIndex
ALTER INDEX "taxi_ride_receipt_email_deliveries_status_nextAttemptAt_created" RENAME TO "taxi_ride_receipt_email_deliveries_status_nextAttemptAt_cre_idx";

-- RenameIndex
ALTER INDEX "vendor_application_documents_applicationId_verificationStatus_i" RENAME TO "vendor_application_documents_applicationId_verificationStat_idx";
