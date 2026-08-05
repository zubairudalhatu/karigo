-- Task 209B: additive controlled production supply, checklist and drill records.
CREATE TYPE "ControlledSupplyGroupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "ControlledSupplyMemberType" AS ENUM ('RIDE_CAPTAIN', 'DELIVERY_CAPTAIN', 'DUAL_MODE_CAPTAIN', 'PRODUCT_SELLER', 'SERVICE_PROVIDER', 'MIXED_PARTNER');
CREATE TYPE "LaunchChecklistItemStatus" AS ENUM ('NOT_READY', 'COMPLETE', 'WAIVED');
CREATE TYPE "LaunchDrillStepStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

CREATE TABLE "controlled_supply_groups" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "cityCode" TEXT NOT NULL,
  "serviceType" "LaunchServiceType" NOT NULL,
  "status" "ControlledSupplyGroupStatus" NOT NULL DEFAULT 'DRAFT',
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "maximumMembers" INTEGER NOT NULL,
  "internalNote" TEXT,
  "createdByAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "controlled_supply_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "controlled_supply_members" (
  "id" UUID NOT NULL,
  "groupId" UUID NOT NULL,
  "memberType" "ControlledSupplyMemberType" NOT NULL,
  "captainUserId" UUID,
  "vendorId" UUID,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "activatedAt" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "reason" TEXT,
  "addedByAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "controlled_supply_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "controlled_operations_customers" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "customerProfileId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "excludedFromCampaigns" BOOLEAN NOT NULL DEFAULT true,
  "internalNote" TEXT,
  "addedByAdminId" UUID NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "controlled_operations_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_operations_checklist_items" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "serviceType" "LaunchServiceType" NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "mandatory" BOOLEAN NOT NULL DEFAULT true,
  "status" "LaunchChecklistItemStatus" NOT NULL DEFAULT 'NOT_READY',
  "note" TEXT,
  "waiverReason" TEXT,
  "waiverExpiresAt" TIMESTAMP(3),
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_operations_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_drill_steps" (
  "id" UUID NOT NULL,
  "drillId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "status" "LaunchDrillStepStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "updatedByAdminId" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_drill_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_drill_events" (
  "id" UUID NOT NULL,
  "drillId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "note" TEXT,
  "adminUserId" UUID NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "launch_drill_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "launch_drills" ADD COLUMN "serviceType" "LaunchServiceType";
ALTER TABLE "launch_drills" ADD COLUMN "controlledCustomerId" UUID;
ALTER TABLE "launch_drills" ADD COLUMN "controlledSupplyGroupId" UUID;
ALTER TABLE "launch_drills" ADD COLUMN "incidentId" UUID;
ALTER TABLE "launch_drills" ADD COLUMN "supportTicketId" UUID;
ALTER TABLE "launch_drills" ADD COLUMN "criticalFailure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "launch_drills" ADD COLUMN "reopenedAt" TIMESTAMP(3);

CREATE INDEX "controlled_supply_groups_cityCode_serviceType_status_idx" ON "controlled_supply_groups"("cityCode", "serviceType", "status");
CREATE INDEX "controlled_supply_members_groupId_enabled_idx" ON "controlled_supply_members"("groupId", "enabled");
CREATE INDEX "controlled_supply_members_captainUserId_enabled_idx" ON "controlled_supply_members"("captainUserId", "enabled");
CREATE INDEX "controlled_supply_members_vendorId_enabled_idx" ON "controlled_supply_members"("vendorId", "enabled");
CREATE UNIQUE INDEX "controlled_operations_customers_userId_key" ON "controlled_operations_customers"("userId");
CREATE UNIQUE INDEX "controlled_operations_customers_cityCode_customerProfileId_key" ON "controlled_operations_customers"("cityCode", "customerProfileId");
CREATE INDEX "controlled_operations_customers_cityCode_enabled_idx" ON "controlled_operations_customers"("cityCode", "enabled");
CREATE UNIQUE INDEX "launch_operations_checklist_items_cityCode_serviceType_key_key" ON "launch_operations_checklist_items"("cityCode", "serviceType", "key");
CREATE INDEX "launch_operations_checklist_items_cityCode_serviceType_status_idx" ON "launch_operations_checklist_items"("cityCode", "serviceType", "status");
CREATE UNIQUE INDEX "launch_drill_steps_drillId_key_key" ON "launch_drill_steps"("drillId", "key");
CREATE INDEX "launch_drill_steps_drillId_position_idx" ON "launch_drill_steps"("drillId", "position");
CREATE INDEX "launch_drill_events_drillId_createdAt_idx" ON "launch_drill_events"("drillId", "createdAt");
CREATE INDEX "launch_drills_cityCode_serviceType_result_idx" ON "launch_drills"("cityCode", "serviceType", "result");

ALTER TABLE "controlled_supply_members" ADD CONSTRAINT "controlled_supply_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "controlled_supply_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "launch_drill_steps" ADD CONSTRAINT "launch_drill_steps_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "launch_drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "launch_drill_events" ADD CONSTRAINT "launch_drill_events_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "launch_drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
