-- Governed Ads Manager, privacy-safe delivery analytics and verified phone changes.
-- Existing campaigns are preserved and receive revision 1 below.
ALTER TYPE "AdCampaignStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';
ALTER TYPE "AdCampaignStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "AdCampaignStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TYPE "AdCampaignActorType" AS ENUM ('VENDOR', 'ADMIN', 'SYSTEM');
CREATE TYPE "AdCampaignEventType" AS ENUM ('IMPRESSION', 'CLICK');
CREATE TYPE "AdCreativeStorageProvider" AS ENUM ('LOCAL_TEST', 'GCS');
CREATE TYPE "PhoneChangeStatus" AS ENUM ('PENDING_NEW_PHONE_VERIFICATION', 'VERIFIED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PhoneChangeAssurance" AS ENUM ('RECENT_PASSWORD', 'SUPPORT_ASSISTED_RECOVERY');

ALTER TABLE "ad_campaigns"
  ADD COLUMN "dailyBudgetKobo" INTEGER,
  ADD COLUMN "spentKobo" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "currentRevisionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "approvedRevisionId" UUID,
  ADD COLUMN "targeting" JSONB;

CREATE TABLE "ad_creative_assets" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "provider" "AdCreativeStorageProvider" NOT NULL,
  "bucket" TEXT,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "metadataStripped" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ad_creative_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_campaign_revisions" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "creativeAssetId" UUID,
  "creativeAltText" TEXT,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "requestedBudgetKobo" INTEGER NOT NULL DEFAULT 0,
  "dailyBudgetKobo" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "placementSurface" "AdPlacementSurface" NOT NULL,
  "targeting" JSONB,
  "createdById" UUID,
  "createdByType" "AdCampaignActorType" NOT NULL,
  "changeReason" TEXT,
  "reviewNotes" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ad_campaign_revisions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ad_campaign_revisions" (
  "id", "campaignId", "revisionNumber", "title", "body", "imageUrl", "ctaLabel", "ctaUrl",
  "requestedBudgetKobo", "startsAt", "endsAt", "placementSurface", "createdByType",
  "submittedAt", "approvedAt", "publishedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), "id", 1, "title", "body", "imageUrl", "ctaLabel", "ctaUrl",
  "requestedBudgetKobo", "startsAt", "endsAt", "placementSurface", 'SYSTEM'::"AdCampaignActorType",
  "submittedAt",
  CASE WHEN "status" IN ('APPROVED', 'ACTIVE', 'PAUSED', 'EXPIRED') THEN "reviewedAt" END,
  CASE WHEN "status" IN ('ACTIVE', 'PAUSED', 'EXPIRED') THEN "updatedAt" END,
  "createdAt", "updatedAt"
FROM "ad_campaigns";

UPDATE "ad_campaigns" c
SET "approvedRevisionId" = r."id"
FROM "ad_campaign_revisions" r
WHERE r."campaignId" = c."id"
  AND c."status" IN ('APPROVED', 'ACTIVE', 'PAUSED', 'EXPIRED');

CREATE TABLE "ad_campaign_events" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  "eventType" "AdCampaignEventType" NOT NULL,
  "placement" "AdPlacementSurface" NOT NULL,
  "dedupeKeyHash" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "costKobo" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ad_campaign_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_campaign_audit_events" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "actorUserId" UUID,
  "actorType" "AdCampaignActorType" NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "AdCampaignStatus",
  "toStatus" "AdCampaignStatus",
  "revisionNumber" INTEGER,
  "reason" TEXT,
  "changedFields" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ad_campaign_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phone_change_requests" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "oldPhoneNumber" TEXT NOT NULL,
  "newPhoneNumber" TEXT NOT NULL,
  "status" "PhoneChangeStatus" NOT NULL DEFAULT 'PENDING_NEW_PHONE_VERIFICATION',
  "assurance" "PhoneChangeAssurance" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "sensitiveActionsHoldUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "phone_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_security_events" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_security_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_campaigns_approvedRevisionId_key" ON "ad_campaigns"("approvedRevisionId");
CREATE UNIQUE INDEX "ad_campaign_revisions_campaignId_revisionNumber_key" ON "ad_campaign_revisions"("campaignId", "revisionNumber");
CREATE INDEX "ad_campaign_revisions_campaignId_createdAt_idx" ON "ad_campaign_revisions"("campaignId", "createdAt");
CREATE UNIQUE INDEX "ad_creative_assets_storageKey_key" ON "ad_creative_assets"("storageKey");
CREATE INDEX "ad_creative_assets_campaignId_createdAt_idx" ON "ad_creative_assets"("campaignId", "createdAt");
CREATE UNIQUE INDEX "ad_campaign_events_eventType_dedupeKeyHash_key" ON "ad_campaign_events"("eventType", "dedupeKeyHash");
CREATE INDEX "ad_campaign_events_campaignId_eventType_occurredAt_idx" ON "ad_campaign_events"("campaignId", "eventType", "occurredAt");
CREATE INDEX "ad_campaign_audit_events_campaignId_createdAt_idx" ON "ad_campaign_audit_events"("campaignId", "createdAt");
CREATE INDEX "phone_change_requests_userId_status_createdAt_idx" ON "phone_change_requests"("userId", "status", "createdAt");
CREATE INDEX "phone_change_requests_newPhoneNumber_status_idx" ON "phone_change_requests"("newPhoneNumber", "status");
CREATE INDEX "account_security_events_userId_createdAt_idx" ON "account_security_events"("userId", "createdAt");

ALTER TABLE "ad_campaign_revisions" ADD CONSTRAINT "ad_campaign_revisions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_revisions" ADD CONSTRAINT "ad_campaign_revisions_creativeAssetId_fkey" FOREIGN KEY ("creativeAssetId") REFERENCES "ad_creative_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_revisions" ADD CONSTRAINT "ad_campaign_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_approvedRevisionId_fkey" FOREIGN KEY ("approvedRevisionId") REFERENCES "ad_campaign_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_creative_assets" ADD CONSTRAINT "ad_creative_assets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_events" ADD CONSTRAINT "ad_campaign_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_events" ADD CONSTRAINT "ad_campaign_events_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ad_campaign_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_audit_events" ADD CONSTRAINT "ad_campaign_audit_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaign_audit_events" ADD CONSTRAINT "ad_campaign_audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phone_change_requests" ADD CONSTRAINT "phone_change_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_security_events" ADD CONSTRAINT "account_security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
