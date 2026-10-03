# Ads Manager, phone identity and Customer Web typography

## Existing ads architecture

The baseline uses `AdCampaign` for vendor or external campaigns, `VendorAdCreditAccount` and `VendorAdCreditLedgerEntry` for controlled internal credit, public `GET /ads/customer-home` delivery, vendor-scoped `/vendor/ads` management, and admin-scoped `/admin/ads` management. Customer mobile renders labelled sponsored content. The baseline had no campaign revisions, event records, creative upload storage, mature governed transitions, or advertiser performance reporting.

The visible `KariGO Sample Ad` sponsored by `Kano Kitchen Sample` should be treated as controlled pilot/demo data. Repository cleanup controls explicitly classify sample/demo terms and Kano Kitchen seeded identities as demo candidates, including associated ad campaigns. The production record was not queried or changed in this local task, so removal still requires a fresh read-only production identity check and separate approval. Recommendation: **MIGRATE TO DEMO ENVIRONMENT**, then remove or pause the production record only in an approved production change window.

## Implemented local design

Campaign status changes use an explicit transition graph. Campaign content is versioned in `AdCampaignRevision`; active approved content continues to resolve through `approvedRevisionId` while a replacement revision is reviewed. Admin edits and transitions create `AdCampaignAuditEvent` entries. `AdCampaignEvent` stores only opaque campaign/revision/placement references, an optional SHA-256 deduplication value, event type, timestamp, and zero-cost pilot spend. It does not store customer identity, contact details, order data, addresses, or destination query enrichment.

Vendor creative upload accepts JPEG or PNG up to 5 MiB, validates dimensions and ratio, strips JPEG EXIF/IPTC application segments, assigns an opaque random key, and keeps the creative inaccessible unless it belongs to the approved revision of an active campaign. Local and test environments use an isolated local directory. Production deliberately returns unavailable until the dedicated storage resource is provisioned.

CTA destinations are normalized HTTPS URLs. Credentials, fragments, non-HTTPS protocols, JavaScript, data URLs, and invalid URLs are rejected. Customer clicks are recorded through KariGO before the already-approved destination is returned.

## Production creative storage requirement

Provision a dedicated bucket such as `karigo-ad-creatives` in the approved production region. Enforce Public Access Prevention and uniform bucket-level access, use Google-managed encryption, keep object versioning off unless retention requirements change, and define a reviewed soft-delete/lifecycle period. Create a dedicated service identity with bucket-scoped `roles/storage.objectUser`; do not reuse Partner or Captain storage credentials. Store replacement credentials in Render secrets, add the provider implementation and health probe, rehearse upload/read/delete against a temporary non-production namespace, then deploy the exact reviewed SHA. No production bucket or credential was created here.

## Phone identity policy

The normal path requires an authenticated session, current password, a distinct valid Nigerian number, uniqueness checking, and a purpose-bound OTP sent to the new number. The canonical user identity and any Rider/Vendor mirror are updated in one transaction only after OTP verification. Existing refresh sessions are revoked, an account-security event is written, and the user receives an in-app security notification. Captain and Partner accounts receive a 24-hour sensitive-action hold timestamp.

Lost-SIM recovery must never bypass verification. Support should require an authenticated session where available, password re-authentication, verified email confirmation where available, and a documented identity review. Captain and Partner cases require higher-assurance evidence and the 24-hour payout/security hold. A support reviewer must record the evidence category, decision, reviewer, timestamps and request reference. The enum and audit model reserve `SUPPORT_ASSISTED_RECOVERY`, but this task does not expose an automatic support override endpoint; that workflow requires a separately reviewed support UI, notification channel, and payout enforcement integration.

## Rollout order and approvals

1. Review and approve the forward-only migration and application diff.
2. Rehearse the migration against a current production-derived temporary PostgreSQL copy. Confirm legacy campaigns receive exactly one revision and active campaigns resolve the preserved revision.
3. Provision and verify the dedicated ad-creative bucket, service identity, bucket-only IAM, and Render secrets under separate approvals.
4. Run non-production creative upload, approval, delivery, click/impression deduplication, replacement-revision, phone-change, session-revocation, and responsive UI acceptance tests.
5. Push the reviewed local commits under a fresh approval and verify only the expected Vercel projects build.
6. Deploy the exact SHA to Render under a separate approval. The pre-deploy Prisma command may apply only this reviewed migration.
7. Keep real ad billing, card charging, wallet top-up, automatic spend charging, and pricing disabled. Any pricing or billing model requires a separate product, finance, legal, and implementation approval.
8. Read-only verify the production sample campaign identity, then seek separate approval before pausing, removing, or migrating it.

Required approvals are: Git push; Vercel consequences; production bucket/service identity/IAM/credential creation; Render environment changes; exact-SHA Render deployment and migration; production sample-ad mutation; any live advertiser pricing/billing; and any support-assisted lost-number override workflow.

## Release-gate completion notes

Customer delivery now requires an authenticated Customer account. The server checks the approved revision, active lifecycle, revision schedule, total budget, daily recorded spend, vendor reservation, requested placement, the customer's stored default/recent city or state, and the requested KariGO service context. A configured city or category fails closed when that context is unavailable. Untargeted dimensions remain unrestricted. Eligible campaigns are ordered with a SHA-256 rotation key derived from customer, Lagos calendar day and campaign ID. Targeting rules are not returned to customers.

Event recording repeats eligibility and hashes customer/revision/render context for replay and rerender deduplication. Reporting supports Today, 7 days, 30 days and campaign lifetime with Lagos daily boundaries, zero-filled missing days and zero-safe CTR. Spend is only recorded `costKobo`; CPC/CPM pricing remains disabled.

An active edit creates a new revision while `approvedRevisionId` continues serving. Replacement submission and admin review are recorded as revision transitions without changing the campaign's ACTIVE/PAUSED lifecycle. Approval alone moves `approvedRevisionId` and copies the reviewed fields into the campaign compatibility columns.

The 24-hour hold is enforced for Partner payout-account creation/replacement and another Captain/Partner phone-number change. Hold evaluation fails closed. There is no self-service Captain payout edit, withdrawal or payout execution endpoint in the current runtime, and there is no unrestricted support override.

Completion revokes every stored refresh token in the same transaction. Existing signed access tokens are not centrally denylisted and can remain usable until their normal short expiry, so clients must clear the local session and reauthenticate; this is a documented residual behavior, not a claim of instant access-token invalidation. The account receives an in-app security alert. The flow does not currently send an independent SMS to the old number or an external email notification, so that notification enhancement remains separate from the verified identity/OTP transaction.

For the production sample, first identify the exact campaign/reference, sponsor/vendor, revision IDs, creative, event aggregates and audit rows read-only. Preserve statistics and audit evidence. Pause it, copy it to a non-production demo identity, verify the copy, then use `CANCELLED` for production when approved; retain `PAUSED` instead if legal review requires reversible retention. Never bulk-delete revision, event, ledger or audit records.
