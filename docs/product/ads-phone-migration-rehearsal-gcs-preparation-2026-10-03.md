# Ads/phone migration rehearsal and GCS preparation

Date: 2026-10-03

Source SHA: `6f279a84feab7046efc0ba57eda5130d23271b36`

Classification: **A — ready for GCS provisioning and controlled deployment rehearsal**

This report records read-only production evidence, the disposable synthetic rehearsal and the proposed infrastructure. It does not authorize a production migration, GCS creation, credential generation, Render change, EAS action or Git push.

## Rehearsal conclusion

The exact target migration passed PostgreSQL 18.6, preserved synthetic production-shaped counts and integrity, and was idempotent. The old runtime remained compatible until a new enum status was introduced. The new runtime passed 107 focused tests and real local ads and phone-change flows. Timing, integrity and rollback limits are in `ads-phone-migration-review-2026-10-03.md`.

## Current GCS inventory — read only

Project: `mystical-method-475123-s9` (`My Maps Project`), accessed with the authorized Zamkah Technologies Limited account. Cloud Console shows the project linked to its existing billing account; no billing identifier is recorded here.

| Bucket | Region | Access controls | Protection |
| --- | --- | --- | --- |
| `karigo-captain-uploads` | `us-south1` | Not public; uniform access | Google-managed encryption; soft delete; versioning/lifecycle off |
| `karigo-partner-private-uploads` | `europe-west3` | PAP; not public; uniform access | Google-managed encryption; seven-day soft delete; versioning, lock and lifecycle off |

Partner storage uses a dedicated service account with bucket-scoped `roles/storage.objectUser`. Its replacement HMAC is active, the malformed former key is inactive, and no JSON service-account key is present. Captain and Partner identities must not be reused. No ad-creative bucket, identity or credential exists.

Project-wide Cloud Storage Data Access audit logging remains explicitly deferred because the control affects all buckets and adds project-wide volume/cost. This is a hardening backlog item, not a provisioning failure.

## Current application gate

`AdCreativeService` accepts JPEG/PNG up to 5 MiB, requires at least 600×300 and aspect ratio 1.2–2.2, strips JPEG APP1/APP13 metadata, calculates SHA-256 and creates an opaque key from 24 random bytes. It stores safe manifest data.

Only `LOCAL_TEST` storage is implemented. Production fails closed with `Production ad-creative storage has not been provisioned.` There is no production GCS adapter or final environment contract. Provisioning alone must not activate the feature.

## Exact proposed resource

Create only after fresh approval:

- Bucket: `karigo-ad-creatives-private`
- Project: `mystical-method-475123-s9`
- Region: `europe-west3` (Frankfurt); Standard class
- Public Access Prevention enforced; uniform bucket-level access enabled; no public IAM
- Google-managed encryption
- Versioning off; seven-day soft delete
- No retention policy, object lock, lifecycle rule, CORS or Requester Pays

Create service account:

`karigo-ad-creative-storage@mystical-method-475123-s9.iam.gserviceaccount.com`

Grant only `roles/storage.objectUser` on this bucket. Do not grant a project-wide role or reuse another identity.

Create one dedicated HMAC interoperability credential because the repository's proven GCS XML integration uses an S3-compatible client. Do not create a JSON key. Capture the distinct Access ID and one-time secret only in:

`C:\Dev\KariGO\private-secrets\ad-creative-storage\hmac-credential.env`

Keep it outside Git and OneDrive with restrictive ACLs. Verify the two values are non-empty and distinct without printing them.

## Proposed application contract

Implement and review the adapter before Render wiring:

```text
AD_CREATIVE_STORAGE_DRIVER=s3
AD_CREATIVE_STORAGE_ENDPOINT=https://storage.googleapis.com
AD_CREATIVE_STORAGE_REGION=auto
AD_CREATIVE_STORAGE_BUCKET=karigo-ad-creatives-private
AD_CREATIVE_STORAGE_FORCE_PATH_STYLE=true
AD_CREATIVE_STORAGE_ACCESS_KEY_ID=<secret>
AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY=<secret>
```

Do not send an explicit S3 server-side-encryption header; Google-managed encryption applies. The adapter must support Put/Get/Delete, persist provider `GCS` and bucket, omit ACL/original-filename metadata, sanitize failures and serve bytes only through the authenticated backend. Random 24-byte keys need no deterministic key secret.

## Separately gated validation

1. Confirm the dedicated HMAC and bucket-scoped role.
2. Run a secret-safe read-only `ListObjectsV2` probe.
3. Stage only reviewed ad-storage variables in Render and stop before save/deploy.
4. Rehearse the exact SHA and migration on a fresh production-derived temporary database.
5. Upload one harmless 600×300 synthetic PNG through the application.
6. Verify the key excludes IDs, filename and PII; verify filename is absent from GCS metadata.
7. Verify manifest, authenticated backend read, cross-tenant denial and anonymous denial.
8. Delete normally and verify the live object is absent; soft-delete recovery is expected.
9. Verify health and unchanged Captain/Partner storage.

## Mobile and release impact

The change set modifies TypeScript/TSX and migration files only. Expo configuration, native plugins, permissions, entitlements and lockfiles are unchanged. Customer ad delivery is OTA-compatible from the JavaScript perspective; no native rebuild is required. No EAS action occurred.

## Next gates

Next, approve local implementation/review of the GCS adapter and environment contract. GCS creation, credential creation, Render environment save, production deployment/migration and the synthetic production smoke each require separate action-time approval. No production resource should be created from this preparation alone.
