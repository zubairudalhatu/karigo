CREATE TYPE "SmeServicesPilotDecisionStatus" AS ENUM (
  'NOT_REVIEWED',
  'GO_INTERNAL_PILOT',
  'CONDITIONAL_GO',
  'NO_GO',
  'DEFERRED'
);

CREATE TABLE "sme_services_pilot_launch_decisions" (
  "id" UUID NOT NULL,
  "decisionStatus" "SmeServicesPilotDecisionStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
  "decisionTitle" TEXT,
  "decisionSummary" TEXT,
  "conditions" TEXT,
  "blockers" TEXT,
  "readinessStatusSnapshot" TEXT NOT NULL,
  "requiredCompletedSnapshot" INTEGER NOT NULL DEFAULT 0,
  "requiredTotalSnapshot" INTEGER NOT NULL DEFAULT 0,
  "optionalCompletedSnapshot" INTEGER NOT NULL DEFAULT 0,
  "optionalTotalSnapshot" INTEGER NOT NULL DEFAULT 0,
  "approvedProvidersSnapshot" INTEGER NOT NULL DEFAULT 0,
  "pendingProviderApplicationsSnapshot" INTEGER NOT NULL DEFAULT 0,
  "activeRequestsSnapshot" INTEGER NOT NULL DEFAULT 0,
  "recordedByAdminId" UUID,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sme_services_pilot_launch_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sme_services_pilot_launch_decisions_decisionStatus_recordedAt_idx" ON "sme_services_pilot_launch_decisions"("decisionStatus", "recordedAt");
CREATE INDEX "sme_services_pilot_launch_decisions_recordedAt_idx" ON "sme_services_pilot_launch_decisions"("recordedAt");
