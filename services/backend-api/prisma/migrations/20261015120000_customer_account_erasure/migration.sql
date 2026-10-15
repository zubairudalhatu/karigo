-- Additive only. Legacy requests remain erasureVersion=0 and are never auto-processed.
ALTER TABLE "account_deletion_requests"
  ADD COLUMN "erasureVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deadlineAt" TIMESTAMP(3),
  ADD COLUMN "receiptTokenHash" TEXT,
  ADD COLUMN "erasurePreparedAt" TIMESTAMP(3),
  ADD COLUMN "noticeAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "noticeSentAt" TIMESTAMP(3),
  ADD COLUMN "noticeProviderId" TEXT,
  ADD COLUMN "cleanupErrorCode" TEXT,
  ADD COLUMN "retentionApproval" TEXT,
  ADD COLUMN "externalCleanupEvidence" TEXT;
CREATE UNIQUE INDEX "account_deletion_requests_receiptTokenHash_key" ON "account_deletion_requests"("receiptTokenHash");

-- A request authenticated before deletion must not recreate credentials,
-- addresses or notification content after access is disabled. Revoke-only
-- updates remain allowed; DELETE is deliberately never obstructed.
CREATE FUNCTION customer_erasure_access_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_deleted TIMESTAMP(3);
BEGIN
  SELECT "deletedAt" INTO owner_deleted FROM users WHERE id = NEW."userId" FOR UPDATE;
  IF owner_deleted IS NOT NULL THEN
    IF TG_TABLE_NAME = 'user_login_activities' THEN
      NEW."userId" := NULL; NEW."phoneNumberMasked" := NULL; NEW.reason := NULL; RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'account_security_events' THEN
      NEW.metadata := NULL; RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF TG_TABLE_NAME = 'refresh_tokens' AND (to_jsonb(NEW)->>'revokedAt') IS NOT NULL THEN RETURN NEW; END IF;
      IF TG_TABLE_NAME = 'device_tokens' AND (to_jsonb(NEW)->>'isActive') = 'false' THEN RETURN NEW; END IF;
      IF TG_TABLE_NAME = 'otp_verifications' AND (to_jsonb(NEW)->>'verifiedAt') IS NOT NULL THEN RETURN NEW; END IF;
      IF TG_TABLE_NAME = 'biometric_credentials' AND (to_jsonb(NEW)->>'status') = 'REVOKED' THEN RETURN NEW; END IF;
      IF TG_TABLE_NAME = 'phone_change_requests' AND (to_jsonb(NEW)->>'status') = 'CANCELLED' THEN RETURN NEW; END IF;
    END IF;
    RAISE EXCEPTION 'Account access is revoked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_erasure_refresh_guard BEFORE INSERT OR UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_otp_guard BEFORE INSERT OR UPDATE ON otp_verifications FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_biometric_guard BEFORE INSERT OR UPDATE ON biometric_credentials FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_device_guard BEFORE INSERT OR UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_notification_guard BEFORE INSERT OR UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_address_guard BEFORE INSERT OR UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_phone_guard BEFORE INSERT OR UPDATE ON phone_change_requests FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_login_guard BEFORE INSERT OR UPDATE ON user_login_activities FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();
CREATE TRIGGER customer_erasure_security_guard BEFORE INSERT OR UPDATE ON account_security_events FOR EACH ROW EXECUTE FUNCTION customer_erasure_access_guard();

-- Tombstones preserve financial FKs without allowing a stale background job
-- to repopulate an erased Customer's identity or personal preferences.
CREATE FUNCTION customer_erasure_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM account_deletion_requests WHERE "userId" = NEW.id AND "erasureVersion" = 1 AND "erasurePreparedAt" IS NOT NULL) THEN
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
CREATE TRIGGER customer_erasure_identity_guard BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION customer_erasure_identity_guard();

CREATE FUNCTION customer_erasure_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM account_deletion_requests WHERE "userId" = NEW."userId" AND "erasureVersion" = 1 AND "erasurePreparedAt" IS NOT NULL) THEN
    IF NEW."referralCode" <> 'deleted-' || NEW.id::text OR NEW."referredBy" IS NOT NULL
      OR NEW."requireRidePin" OR NEW."loyaltyBalance" <> 0 OR NEW."averageRating" IS NOT NULL THEN
      RAISE EXCEPTION 'Erased Customer preferences cannot be restored' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customer_erasure_profile_guard BEFORE INSERT OR UPDATE ON customer_profiles FOR EACH ROW EXECUTE FUNCTION customer_erasure_profile_guard();
