ALTER TABLE "users" ADD COLUMN "customerAccessDeletedAt" TIMESTAMP(3);
ALTER TABLE "account_deletion_requests"
 ADD COLUMN "sharedIdentityRetained" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "policyVersion" TEXT,
 ADD COLUMN "auditKeepUntil" TIMESTAMP(3);
-- Preserve Customer access revocation for requests created before this column existed.
-- This updates only the permanent-erasure lifecycle, never historical cancellation.
UPDATE users u SET "customerAccessDeletedAt" = d."revokedAt"
FROM (SELECT "userId", MIN(COALESCE("confirmedAt", "requestedAt")) AS "revokedAt"
 FROM account_deletion_requests WHERE "accountType"='CUSTOMER' AND "erasureVersion"=1
 AND status <> 'CANCELLED' GROUP BY "userId") d
WHERE u.id=d."userId" AND u."customerAccessDeletedAt" IS NULL;
CREATE TABLE "data_retention_holds" (
 "id" UUID PRIMARY KEY, "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('INTERNAL','LEGAL','COURT','REGULATORY')),
 "authorityReference" TEXT NOT NULL, "authorizedById" UUID NOT NULL, "reasonCode" TEXT NOT NULL,
 "startedAt" TIMESTAMP(3) NOT NULL, "nextReviewAt" TIMESTAMP(3) NOT NULL,
 "expiresAt" TIMESTAMP(3), "releasedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "data_retention_holds_resourceType_resourceId_idx" ON "data_retention_holds"("resourceType","resourceId");
CREATE INDEX "data_retention_holds_nextReviewAt_releasedAt_idx" ON "data_retention_holds"("nextReviewAt","releasedAt");
CREATE TABLE "data_retention_hold_events" (
 "id" UUID PRIMARY KEY, "holdId" UUID NOT NULL REFERENCES "data_retention_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" UUID NOT NULL, "authorityReference" TEXT NOT NULL, "action" TEXT NOT NULL,
 "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "data_retention_hold_events_holdId_recordedAt_idx" ON "data_retention_hold_events"("holdId","recordedAt");
CREATE TABLE "data_retention_resources" (
 "id" UUID PRIMARY KEY, "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "category" TEXT NOT NULL, "triggerAt" TIMESTAMP(3) NOT NULL, "retainUntil" TIMESTAMP(3) NOT NULL,
 "policyVersion" TEXT NOT NULL, "disposedAt" TIMESTAMP(3), "evidenceReference" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "data_retention_resources_resourceType_resourceId_key" ON "data_retention_resources"("resourceType","resourceId");
CREATE INDEX "data_retention_resources_disposedAt_retainUntil_idx" ON "data_retention_resources"("disposedAt","retainUntil");

-- A retained identity belongs to a surviving role, not the deleted Customer scope.
CREATE OR REPLACE FUNCTION customer_erasure_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."customerAccessDeletedAt" IS NOT NULL AND OLD."deletedAt" IS NOT NULL THEN
    IF NEW."fullName" <> 'Deleted Customer' OR NEW."phoneNumber" <> 'deleted:' || NEW.id::text
      OR NEW."passwordHash" <> '' OR NEW."profilePhotoUrl" IS NOT NULL
      OR NEW."phoneVerified" OR NEW."emailVerified" OR NEW."deletedAt" IS NULL
      OR NEW."onboardingPasswordSetAt" IS NOT NULL OR NEW."lastLoginAt" IS NOT NULL
      OR NEW."accountStatus" <> 'DEACTIVATED' OR NEW.role <> 'CUSTOMER'
      OR (NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email) THEN
      RAISE EXCEPTION 'Erased Customer identity cannot be restored' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION customer_scope_access_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scope_deleted TIMESTAMP(3);
BEGIN
 IF TG_TABLE_NAME = 'users' THEN
  IF OLD."customerAccessDeletedAt" IS NOT NULL AND NEW."customerAccessDeletedAt" IS DISTINCT FROM OLD."customerAccessDeletedAt" THEN
   RAISE EXCEPTION 'Deleted Customer access cannot be restored' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
 END IF;
 SELECT "customerAccessDeletedAt" INTO scope_deleted FROM users WHERE id = NEW."userId" FOR UPDATE;
 IF scope_deleted IS NOT NULL AND to_jsonb(NEW)->>'appSurface' = 'CUSTOMER_APP' THEN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'device_tokens' AND NEW."isActive" = false THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Customer access is revoked' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER customer_scope_identity_guard BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION customer_scope_access_guard();
CREATE TRIGGER customer_scope_device_guard BEFORE INSERT OR UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION customer_scope_access_guard();
CREATE TRIGGER customer_scope_biometric_guard BEFORE INSERT OR UPDATE ON biometric_credentials FOR EACH ROW EXECUTE FUNCTION customer_scope_access_guard();
CREATE FUNCTION customer_scope_purchase_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM customer_profiles c JOIN users u ON u.id=c."userId" WHERE c.id=NEW."customerId" AND u."customerAccessDeletedAt" IS NOT NULL) THEN
  RAISE EXCEPTION 'Customer access is revoked' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER customer_scope_utility_guard BEFORE INSERT ON utility_transactions FOR EACH ROW EXECUTE FUNCTION customer_scope_purchase_guard();
CREATE TRIGGER customer_scope_order_guard BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION customer_scope_purchase_guard();
CREATE TRIGGER customer_scope_ride_guard BEFORE INSERT ON taxi_trips FOR EACH ROW EXECUTE FUNCTION customer_scope_purchase_guard();
CREATE TRIGGER customer_scope_payment_guard BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION customer_scope_purchase_guard();

CREATE TABLE "ad_campaign_billing_aggregates" (
 "id" UUID PRIMARY KEY, "campaignId" UUID NOT NULL, "campaignReference" TEXT NOT NULL,
 "eventMonth" TIMESTAMP(3) NOT NULL, "eventType" "AdCampaignEventType" NOT NULL,
 "eventCount" BIGINT NOT NULL DEFAULT 0, "costKobo" BIGINT NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ad_billing_campaign_month_type_key" ON "ad_campaign_billing_aggregates"("campaignId","eventMonth","eventType");

-- A seven-year audit expiry must not restore erased Customer preferences.
CREATE OR REPLACE FUNCTION customer_erasure_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM users WHERE id=NEW."userId" AND "customerAccessDeletedAt" IS NOT NULL)
 AND EXISTS (SELECT 1 FROM customer_profiles WHERE id=NEW.id AND "referralCode"='deleted-' || NEW.id::text) THEN
  IF NEW."referralCode" <> 'deleted-' || NEW.id::text OR NEW."referredBy" IS NOT NULL
   OR NEW."requireRidePin" OR NEW."loyaltyBalance" <> 0 OR NEW."averageRating" IS NOT NULL THEN
   RAISE EXCEPTION 'Erased Customer preferences cannot be restored' USING ERRCODE = '42501';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
