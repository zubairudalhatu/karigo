CREATE TYPE "LaunchStage" AS ENUM ('OFF', 'OPERATIONS_ONLY', 'INVITE_ONLY', 'LIMITED_PUBLIC', 'CITY_WIDE', 'PAUSED');
CREATE TYPE "LaunchServiceType" AS ENUM ('RIDES', 'FOOD', 'GROCERIES', 'MARKETPLACE', 'PARCEL_DELIVERY', 'SME_SERVICES');
CREATE TYPE "LaunchCohortStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "LaunchCohortMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');
CREATE TYPE "LaunchReadinessStatus" AS ENUM ('NOT_READY', 'AT_RISK', 'READY', 'WAIVED');
CREATE TYPE "LaunchIncidentSeverity" AS ENUM ('SEV1', 'SEV2', 'SEV3', 'SEV4');
CREATE TYPE "LaunchIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATING', 'MONITORING', 'RESOLVED', 'CLOSED');
CREATE TYPE "LaunchDrillType" AS ENUM ('RIDE_END_TO_END', 'DELIVERY_END_TO_END', 'PRODUCT_ORDER_END_TO_END', 'SERVICE_REQUEST_END_TO_END', 'PAYMENT_SUCCESS', 'PAYMENT_FAILURE', 'CUSTOMER_CANCELLATION', 'CAPTAIN_CANCELLATION', 'PARTNER_REJECTION', 'SUPPORT_ESCALATION', 'EMERGENCY_SERVICE_PAUSE');
CREATE TYPE "LaunchDrillResult" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED');

CREATE TABLE "launch_cohorts" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "cityCode" TEXT NOT NULL,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "maximumCustomers" INTEGER NOT NULL,
  "status" "LaunchCohortStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdByAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_cohorts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_market_configs" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "cityName" TEXT NOT NULL,
  "serviceType" "LaunchServiceType" NOT NULL,
  "launchStage" "LaunchStage" NOT NULL DEFAULT 'OFF',
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "activeFrom" TIMESTAMP(3),
  "activeUntil" TIMESTAMP(3),
  "operatingHours" JSONB,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
  "allowedZoneIds" JSONB,
  "inviteCohortId" UUID,
  "maxConcurrentRequests" INTEGER,
  "maxUnassignedRequests" INTEGER,
  "minimumOnlineCaptainCount" INTEGER,
  "minimumOnlinePartnerCount" INTEGER,
  "assignmentTimeoutMinutes" INTEGER,
  "captainLocationFreshMinutes" INTEGER,
  "customerMessage" TEXT,
  "closedMessage" TEXT,
  "internalNote" TEXT,
  "pausedReason" TEXT,
  "emergencyClosed" BOOLEAN NOT NULL DEFAULT false,
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_market_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_market_config_history" (
  "id" UUID NOT NULL,
  "configId" UUID NOT NULL,
  "previousStage" "LaunchStage" NOT NULL,
  "newStage" "LaunchStage" NOT NULL,
  "previousValue" JSONB NOT NULL,
  "newValue" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "adminUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "launch_market_config_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_cohort_members" (
  "id" UUID NOT NULL,
  "cohortId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "LaunchCohortMemberStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "removedAt" TIMESTAMP(3),
  "reason" TEXT,
  "addedByAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_cohort_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_readiness_items" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "LaunchReadinessStatus" NOT NULL DEFAULT 'NOT_READY',
  "note" TEXT,
  "waiverReason" TEXT,
  "waiverExpiresAt" TIMESTAMP(3),
  "updatedByAdminId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_readiness_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_incidents" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "severity" "LaunchIncidentSeverity" NOT NULL,
  "cityCode" TEXT NOT NULL,
  "serviceType" "LaunchServiceType",
  "marketConfigId" UUID,
  "status" "LaunchIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "timeline" JSONB,
  "assignedOwnerId" UUID,
  "customerImpact" TEXT,
  "captainPartnerImpact" TEXT,
  "mitigation" TEXT,
  "rootCause" TEXT,
  "resolution" TEXT,
  "followUpActions" TEXT,
  "openedByAdminId" UUID NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_drills" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "drillType" "LaunchDrillType" NOT NULL,
  "customerUserId" UUID,
  "captainUserId" UUID,
  "partnerUserId" UUID,
  "relatedReference" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "result" "LaunchDrillResult" NOT NULL DEFAULT 'NOT_STARTED',
  "failureStage" TEXT,
  "notes" TEXT,
  "evidenceReference" TEXT,
  "responsibleAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_drills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_capacity_denials" (
  "id" UUID NOT NULL,
  "cityCode" TEXT NOT NULL,
  "serviceType" "LaunchServiceType" NOT NULL,
  "marketConfigId" UUID,
  "reasonCode" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "launch_capacity_denials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "launch_market_configs_cityCode_serviceType_key" ON "launch_market_configs"("cityCode", "serviceType");
CREATE INDEX "launch_market_configs_cityCode_launchStage_isEnabled_idx" ON "launch_market_configs"("cityCode", "launchStage", "isEnabled");
CREATE INDEX "launch_market_config_history_configId_createdAt_idx" ON "launch_market_config_history"("configId", "createdAt");
CREATE INDEX "launch_market_config_history_adminUserId_createdAt_idx" ON "launch_market_config_history"("adminUserId", "createdAt");
CREATE INDEX "launch_cohorts_cityCode_status_idx" ON "launch_cohorts"("cityCode", "status");
CREATE UNIQUE INDEX "launch_cohort_members_cohortId_userId_key" ON "launch_cohort_members"("cohortId", "userId");
CREATE INDEX "launch_cohort_members_userId_status_idx" ON "launch_cohort_members"("userId", "status");
CREATE UNIQUE INDEX "launch_readiness_items_cityCode_key_key" ON "launch_readiness_items"("cityCode", "key");
CREATE INDEX "launch_readiness_items_cityCode_category_status_idx" ON "launch_readiness_items"("cityCode", "category", "status");
CREATE UNIQUE INDEX "launch_incidents_reference_key" ON "launch_incidents"("reference");
CREATE INDEX "launch_incidents_cityCode_status_severity_idx" ON "launch_incidents"("cityCode", "status", "severity");
CREATE INDEX "launch_incidents_serviceType_status_idx" ON "launch_incidents"("serviceType", "status");
CREATE INDEX "launch_drills_cityCode_drillType_result_idx" ON "launch_drills"("cityCode", "drillType", "result");
CREATE INDEX "launch_capacity_denials_cityCode_serviceType_occurredAt_idx" ON "launch_capacity_denials"("cityCode", "serviceType", "occurredAt");

ALTER TABLE "launch_market_configs" ADD CONSTRAINT "launch_market_configs_inviteCohortId_fkey" FOREIGN KEY ("inviteCohortId") REFERENCES "launch_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "launch_market_config_history" ADD CONSTRAINT "launch_market_config_history_configId_fkey" FOREIGN KEY ("configId") REFERENCES "launch_market_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "launch_cohort_members" ADD CONSTRAINT "launch_cohort_members_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "launch_cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "launch_incidents" ADD CONSTRAINT "launch_incidents_marketConfigId_fkey" FOREIGN KEY ("marketConfigId") REFERENCES "launch_market_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "launch_capacity_denials" ADD CONSTRAINT "launch_capacity_denials_marketConfigId_fkey" FOREIGN KEY ("marketConfigId") REFERENCES "launch_market_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
