# Ads, phone and UX local release gate

## Isolated authenticated environment

QA used a loopback-only PostgreSQL 18 database named `karigo_ads_qa_20261003`, local backend and web processes, synthetic seeded identities, mock OTP delivery and temporary creative storage. The committed helper refuses production mode and requires both `KARIGO_LOCAL_QA=1` and a loopback database whose name starts with `karigo_ads_qa_`. No production-derived data, provider call or external storage was used.

## Authenticated responsive QA

Browser accessibility-tree inspection and screenshots were completed at 1440x900, 1280x720, 768x1024 and 390x844.

- Customer: Dashboard, Profile, secure phone-change entry, Support and Account deletion passed all four widths. The sponsored card kept its disclosure, meaningful image alternative, responsive creative and identifiable CTA. Cards/fields stayed bounded and the document had no horizontal overflow. Narrow portal navigation remained keyboard-focusable in its intended horizontal scroller.
- Vendor: Ads overview, campaign lists and lifecycle statuses, create/upload/preview, CTA/budgets/targeting, controlled credit, revision history, all four performance ranges and Profile passed. A document-level mobile overflow caused by the workspace shell was found and fixed by constraining the shell/sidebar/content and keeping only navigation in bounded horizontal scrollers. The root then matched tablet and phone viewport width.
- Admin: Ads overview, campaign details, advertiser/budget/schedule/revision/audit information and governed actions passed all four widths with no unnamed controls or document overflow. A synthetic draft was submitted and a synthetic under-review campaign was approved through the governed UI. The former arbitrary-state control is absent as the primary workflow.

## Accessibility

**AUTOMATED AXE NOT INSTALLED.** No dependency was added for this gate.

The browser accessibility tree showed logical H1/H2/H3 hierarchy, named inputs/buttons/range controls, meaningful creative/logo alternatives and textual chart fallbacks. Keyboard focus order followed document order; focus indicators are visible; native form controls expose labels; status/error copy is presented adjacent to the relevant forms; buttons and links have appropriate semantics; mobile controls remain usable. Responsive reflow at the phone/tablet widths and narrow-width inspection provided the practical 200% text/reflow check. No inaccessible dialog was introduced. Manual contrast review found no blocking low-contrast state.

## Ads evidence

- Targeting cases A-I are covered by focused synthetic unit/integration cases: global, matching Abuja, missing location fail-closed, non-Abuja rejection, category match/mismatch, placement mismatch, schedule exclusion, total/daily budget exhaustion, and approved-revision continuity while a replacement is pending.
- Image upload accepted a bounded synthetic PNG, produced a preview with alternative text and created a local draft. JPEG/PNG content signatures, size bounds and non-HTML/SVG rejection are covered by service tests.
- Performance ranges Today, 7 days, 30 days and Campaign lifetime rendered from recorded events. Lagos calendar buckets, missing days, zero-impression CTR and cost-only spend are covered by focused tests. No reach or spend is fabricated.
- The Customer CTA is normalized HTTPS and event recording returns the approved destination only for a click. Unsafe protocols, credentials, fragments and oversized destinations are rejected.

## Phone-change evidence

Authenticated local transactions were completed for Customer, Captain and Partner. Each flow required the current password, issued a purpose-bound OTP, rejected `000000`, accepted the local mock OTP, rejected a phone number already owned by another account, updated the verified number and revoked refresh tokens. The already-issued access token remained valid for its documented short lifetime; the prior refresh token was rejected. Each account received one security event and one notification. Customer received no sensitive-action hold; Captain and Partner received active 24-hour holds. A Partner payout-account write returned the expected hold error before mutation.

## Validation record

Final command results are recorded in the release report. The dependency audit ran once, the JSON stayed outside source, and no audit fix or package change occurred. The lockfile, production, Git remote, Render, Vercel and EAS were unchanged.

## Production-shaped migration rehearsal addendum

The exact `20261003120000_ads_manager_phone_change` migration passed in a disposable loopback-only PostgreSQL 18.6 database with synthetic production-shaped aggregates: 48 unique-phone users, one active campaign, one credit account and no ledger entries. The first deploy exited 0 in 6.407 seconds including Prisma startup, created exactly one system revision and produced no integrity error. The second deploy exited 0 with no pending migration.

The prior guarded Partner migration contains production-record hash predicates that synthetic identifiers cannot reproduce. A temporary local-only copy changed only those predicates to match seven synthetic fixtures, then its local checksum was normalized to the repository checksum. The ads/phone migration under review was not altered.

The old generated client read and wrote ordinary campaign data after migration, with the write intentionally rolled back. It cannot deserialize a new enum status after the new runtime writes one, so rollback must first prove no `CHANGES_REQUESTED`, `SCHEDULED` or `COMPLETED` row exists. The new runtime completed Customer, Captain and Partner phone changes and the governed Partner campaign create/upload/submit/review/approve/deliver/event flow locally without an external call.

Six focused suites passed: 107 tests. Prisma validation, backend/mobile typechecks, diff checks and secret scanning passed. The proposed ad-creative GCS resource remains uncreated and production creative storage continues to fail closed.
