# Captain transient foreground readiness and controlled-access review

Local-only correction based on backend commit 92012bf. No migration, Production
configuration change, membership grant, native setting or new dependency.

## Contract

Authenticated POST /api/v1/launch/availability/me/captain (HTTP 200, no-store)
extends the existing Captain launch-availability service. Coordinates are in the
JSON body, never the URL. Identity comes only from the authenticated subject.

Body: city (fallback only), latitude, longitude, recordedAt, accuracyMeters,
optional existing zoneId. Role/status/subject/availability/trace fields are not
accepted. The coordinate radius, not the supplied city or profile city, selects
the resolved market. The same application, account, launch-stage, dates/hours,
zone, document, active-work and controlled-supply gates remain authoritative.
No synthetic flag, Admin exception or membership bypass is added.

The body exists only in request memory. This route performs database reads only;
it never calls updateAvailability, writes readiness/dispatch coordinates,
creates trace points, changes online preferences, creates work/finance/audits,
or starts a background tracker. The normal operational PATCH remains unchanged.

Response adds readiness.locationState, currentArea (city-level only), reasonCode,
accuracyMeters, capturedAt and validUntil. Per-service areaState distinguishes
LOCATION_UNKNOWN, AREA_APPROVED, AREA_NOT_APPROVED and AREA_NOT_EVALUATED; accessState
distinguishes CONTROLLED_ACCESS_REQUIRED, ELIGIBLE and other BLOCKED outcomes.
Missing stored coordinates in the existing GET now mean LOCATION_UNKNOWN, not
OPERATING_AREA_NOT_APPROVED. A pending UI request is shown as Resolving current area.

## Freshness / accuracy evidence

Use the actual Expo LocationObject timestamp via CaptainLocation.recordedAt,
never the later UI-receipt time. Maximum age 30 seconds reuses the existing
Dashboard ONLINE_LOCATION_REUSE_MS. Accuracy at most 250 metres reuses the current
location.ts APPROXIMATE_ACCURACY_METERS / precise requirement. No tolerance or
accuracy measurement is invented. Future/invalid timestamps, missing timestamps,
missing measured accuracy and excessive age/accuracy fail closed with distinct
reason codes. Null accuracy is not treated as zero.

## Client

Offline foreground fixes use only the transient launch POST, never the dispatch
availability PATCH or trace upload. Responses remain in React memory only.
The area label uses the transient result while offline, not an unrelated stored
location. Go Online requires an unexpired readiness result AND service eligibility.
The server still rechecks actual current coordinates on the normal online transition.
A late city-only GET cannot overwrite a valid transient result. Results expire
at the source capture timestamp + 30 seconds. Recenter obtains/reuses a precise fix
within that same window and can retry a failed check without changing availability.
Existing accepted-work background tracking gates are unchanged.

CLIENT_JS_CHANGE_REQUIRED=YES: the installed Build 1 needs a reviewed JS/OTA release
before physical revalidation. No native rebuild/configuration/permission change
is needed. Nothing is published by this task.

## Controlled access (review only)

Tables: controlled_supply_groups / controlled_supply_members. A membership points
to captainUserId with memberType RIDE_CAPTAIN (or the existing dual-mode type),
city/service group, enabled flag, active group status and operating dates.
Admin authorization: SUPER_ADMIN, OPERATIONS_ADMIN or DISPATCH_OFFICER through
AdminRolesGuard; no global role promotion for the Captain is needed.

Existing controls:
- POST /api/v1/admin/production-launch/controlled-groups/:groupId/members
- PATCH /api/v1/admin/production-launch/controlled-groups/:groupId/members/:memberId

Normal Captain approval does not automatically add controlled supply. The QA
Captain's absence is expected under this separate operations gate. A city-matched,
bounded RIDE_CAPTAIN membership must be separately approved, not auto-granted.

Important remaining dependency: activating a membership currently evaluates
LOCATION_STALE using persisted location. A transient readiness result deliberately
does not populate that storage. The operations activation flow therefore needs
separate review before claiming this QA account can be enabled without offline
telemetry. No activation check, group, membership or bypass was changed here.

## Validation

Focused readiness/area/controlled gate tests; Captain transient/privacy/race/expiry
regression; existing Captain availability/location/background regressions; full
backend tests including isolated PostgreSQL; backend/Captain typechecks; backend
build; credential and diff scans. Production remains QA OFF, fixture-free and offline.
Validated locally on 20 October 2026:
- Focused readiness/area/controlled-supply suites: 75 passed.
- Full backend including isolated PostgreSQL: 1,432 passed, 98 skipped, 0 failed.
- Captain transient-readiness/body/race/expiry/privacy regression: PASS.
- Captain availability, pre-offer, location/background and ordinary regressions: PASS.
- Backend/Captain typechecks and backend build: PASS.
- Credential/diff/protected-scope scans: PASS.
- Read-only Production recheck: SHA 92012bf unchanged; QA OFF; Captain offline;
  zero fixtures/financial records; controlled membership remains absent.


## Controlled-supply entitlement correction (local, not deployed)

ControlledSupplyGroup provides city/service scope, an administrative operating window,
capacity and Admin ownership. ControlledSupplyMember provides an enabled entitlement,
activation/deactivation timestamps, reason and granting Admin. Neither stores a physical
presence attestation. Existing accountEligible reads this administrative entitlement;
physical presence belongs to online readiness. The model is ADMIN_ENTITLEMENT.

Captain add/activation now ignores only LOCATION_STALE and the two membership-not-yet-enabled
blockers. It retains approval, documents, vehicle/profile, account/login, city/service,
capacity, group-window and active-assignment safeguards. Partner behavior is unchanged.
Operational captainEligibility still reports LOCATION_STALE. No coordinates, dispatch
telemetry or availability writes are added. No attestation, schema migration or native
configuration change is required. Existing Admin guards and audit events remain intact.
The QA Captain has not been granted membership.

The offline cockpit shows Locating, Area not approved, Controlled access required or
Eligible to go online from the fresh server response. Area and membership are independent;
a valid entitlement never overrides an outside-area result. Online remains gated by all
existing server conditions and the 30-second readiness expiry.

Proposed release order (requires separate review/approval): deploy the combined backend
transient-readiness and entitlement changes first, without migrations and with QA OFF;
verify health/readiness and authenticated fail-closed readiness. Then publish the reviewed
Captain iOS-only runtime 1.2.0 JS candidate after export/config validation, with Android
unchanged. Physically verify area/status while offline. Any QA Captain entitlement must
subsequently use the existing authorized Admin add/activation path under separate approval.
No fixture or QA window is part of this release.

Validation: full backend 1,440 passed / 98 skipped / 0 failed, including isolated
PostgreSQL constraint/lifecycle regressions; final focused readiness/membership suite
50 passed. Backend and Captain typechecks, backend build, Captain regression/location/
waypoint/pre-offer/background checks and credential/diff scans passed. The final focused
run includes an additional revocation test added after the full run started.

iOS Hermes export passed with the previously reviewed Metro realpath canonicalization
used temporarily for local validation (not committed or published); new readiness API
and distinct eligibility labels were confirmed in the exported bytecode. Native/runtime
configuration was not changed. A release artifact must be prepared in the reviewed Build 1
release workspace before any separately approved OTA publication.
