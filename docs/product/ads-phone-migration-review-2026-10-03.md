# Ads and phone migration review

Migration: `20261003120000_ads_manager_phone_change`
Source SHA: `6f279a84feab7046efc0ba57eda5130d23271b36`

Verdict: **ready for controlled production execution after the separately gated ad-creative storage work**. The exact migration passed a synthetic production-shaped PostgreSQL 18 rehearsal. This document does not authorize a production migration, deployment, GCS mutation, EAS action or Git push.

## Production read-only baseline

Production is Render PostgreSQL 18.4, service `karigo-staging-db`, database `karigo_staging`, Frankfurt, Available. The backend returned HTTP 200/status `ok` on SHA `cd6f325a33cb511f28a243a69077f038c90960e8`. Prisma had 51 history rows: 49 completed, two resolved/rolled-back and zero unresolved failures. The target migration was absent.

Safe aggregates were 48 users, 48 distinct non-null phone numbers, one active campaign, one vendor credit account and zero ledger entries. The new migration tables were absent. Existing phone uniqueness and campaign/credit relations were present. No personal data, phone value, creative URL or payment payload was read or retained.

## Static assessment

The migration is additive. It adds three campaign enum values, campaign columns and creative-asset, revision, event, audit, phone-change and account-security tables. It backfills one system revision per campaign. Approved, active, paused and expired campaigns receive an approved-revision link. It deletes no existing row.

Foreign keys use reviewed cascade or set-null behavior. Uniqueness covers revision numbering, approved revisions, storage keys and event dedupe keys. Indexes cover campaign delivery, vendor/status views, revision history, reporting and security history. `gen_random_uuid()` worked on PostgreSQL 18.6.

Short `ACCESS EXCLUSIVE` locks can occur while altering `ad_campaigns`. Constant defaults are metadata-only on PostgreSQL 18, but revision insert/update is linear in campaign count, and indexes/foreign keys are non-concurrent. Production currently has one campaign. No blocked session remained after rehearsal; statement-level lock duration was not isolated from Prisma startup.

The enum additions are forward-only. Application rollback is safe only while no row contains `CHANGES_REQUESTED`, `SCHEDULED` or `COMPLETED`. Once the new runtime writes one, the old generated Prisma client cannot deserialize it. Never remove schema, enum values, revisions or audit evidence automatically.

## Isolated rehearsal

The loopback-only PostgreSQL 18.6 database `karigo_ads_qa_migration_rehearsal_20261003` contained synthetic data only: 48 users matching production role aggregates, unique phones, one active campaign, one credit account, zero ledger entries and seven synthetic rows needed for the preceding migration state.

One prior guarded migration contains production-record hash predicates that synthetic identifiers cannot reproduce. A temporary local-only copy changed exactly those two predicates to match the seven fixtures; its local checksum was then normalized to the repository checksum. The target ads/phone migration was executed byte-for-byte from the repository.

The first `npx prisma migrate deploy` ran from `2026-10-03T19:39:14.5644623Z` to `2026-10-03T19:39:20.9912969Z`, took 6.407 seconds including startup, and exited 0 with no warning/error. It produced 50 completed migrations and zero failures; preserved all 48 users/phones and the campaign; created one system revision linked to the active campaign; preserved title, body, image, budget and identity; and produced no orphan, cross-campaign link or negative spend. Expected indexes and foreign keys were present.

The second deploy ran from `2026-10-03T19:39:31.3307709Z` to `2026-10-03T19:39:38.0214905Z`, took 6.667 seconds and exited 0 with `No pending migrations to apply`.

## Runtime compatibility and regression

The production client read the 48 users, campaign and credit account after migration and created a draft campaign inside a rolled-back transaction. A temporary `CHANGES_REQUESTED` row proved the old client fails with `Value 'CHANGES_REQUESTED' not found in enum 'AdCampaignStatus'`; the row was deleted.

The new runtime completed Customer, Partner and Captain phone-change flows with password/OTP verification, phone update, refresh-session revocation and security/notification evidence. Partner and Captain received the 24-hour hold; Customer did not. A Partner campaign was created, received a synthetic PNG in local test storage, was submitted, reviewed and approved, appeared in Customer delivery and recorded an event.

Six Jest suites passed with 107 tests. Prisma validation, backend TypeScript, all three mobile typechecks, `git diff --check` and changed-file secret scanning passed. No external provider was called.

## Rollback and production recommendation

Take a current logical backup and safe counts before production deployment. Use Render's existing `npx prisma migrate deploy` pre-deploy command and monitor locks, history and health. If failure occurs before new code starts, preserve the additive schema and use the prior SHA only after proving no new enum state exists. Otherwise keep the new runtime or deploy a forward correction.

Production execution requires separate approval. Ad creative activation additionally requires the reviewed adapter and separately approved GCS bucket, identity, credential capture and Render environment wiring in the companion report.
