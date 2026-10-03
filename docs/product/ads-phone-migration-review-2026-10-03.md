# Ads and phone migration review

Migration: `20261003120000_ads_manager_phone_change`

Verdict: **ready for a production-derived rehearsal; not approved for production execution**.

The migration is additive. Existing `ad_campaigns` rows keep their primary keys and delivery fields and receive zero/default counters plus one system-created revision. Approved, active, paused and expired rows receive `approvedRevisionId`; drafts and review-stage rows retain a null approved revision. New event, revision, audit, creative, phone-change and account-security tables use foreign keys with deliberate cascade or set-null behavior. Required new scalar fields have defaults or are populated in the same migration. No existing row is deleted.

The unique approved-revision relation prevents one revision from being approved for multiple campaigns. Campaign/revision numbering, creative storage keys and event dedupe keys have uniqueness constraints. Query indexes cover delivery state/placement, vendor state, revision history, campaign event reporting and security history. PostgreSQL permits multiple nulls in the event dedupe unique index, while the application now always supplies a hash for customer events.

Rehearsal must capture pre/post campaign counts; verify exactly one revision per pre-existing campaign; verify each approved-revision link stays within its campaign; exercise replacement-review and phone-hold flows; measure the table/backfill/index/FK lock window; verify `gen_random_uuid()` on PostgreSQL 18; and prove a second `prisma migrate deploy` is a no-op. The backfill is proportional to existing campaign count and must be measured on the production-derived copy.

Rollback uses forward correction. Application rollback alone does not remove the schema. Do not drop tables, enum values, revisions or audit evidence automatically. If deployment fails after migration, preserve the database and apply a separately reviewed corrective migration.

The runtime requires the generated Prisma client from the exact application SHA. Production creative storage remains intentionally unavailable until its dedicated bucket, identity and credentials are separately provisioned and rehearsed.
