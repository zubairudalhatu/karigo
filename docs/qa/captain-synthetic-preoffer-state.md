# Synthetic Captain Ride pre-offer state correction

Scope: internal synthetic fixture only. No migration, client runtime change, OTA,
native build, normal Ride lifecycle or financial change.

## Existing state machine

| Stage | Trip state | Captain binding/lock | Presentation and tracking |
|---|---|---|---|
| Pre-offer | REQUESTED | No trip driver; intended target in immutable internal registry only; no lock | Captain remains offline; fixture absent from both Captain feeds; normal availability controls |
| Offered | DRIVER_ASSIGNED | Driver assigned atomically with OFFERED lock | Existing assigned Ride workspace/reservation; incompatible work blocked; no accepted-work background tracking |
| Accepted | ACCEPTED, ARRIVED_PICKUP | ACCEPTED lock | Existing Busy/active workspace; accepted-work background tracking gate |
| In progress | STARTED, ARRIVED_DESTINATION | IN_PROGRESS lock | Existing active-work behavior |
| Terminal | COMPLETED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_DRIVER, CANCELLED_BY_ADMIN, EXPIRED | Released through existing lifecycle or authenticated fixture cleanup | No active workspace/background work tracking |

There is no TaxiTripStatus.OFFERED enum: DRIVER_ASSIGNED plus the OFFERED work
lock is the existing offer representation. Reservation at offer is intentional;
background tracking requires ACCEPTED or IN_PROGRESS, not just a reservation.

## Correction and security

Create no longer assigns driverProfileId. Offer compares REQUESTED plus null driver
and assigns the registry's target inside the same transaction as the OFFERED lock
and durable one-offer audit. The intended Captain cannot be supplied by a client.

Policy and cleanup accept an unassigned REQUESTED fixture, or its EXPIRED remnant,
only when no durable offer claim exists. Wrong driver/customer binding and removal
of an assignment after offer remain fail-closed. Cleanup handles both pre-offer and
offered states and preserves financial evidence and the Captain identity.

The normal Captain feeds already filter by driverProfileId. Therefore the existing
Dashboard never receives the pre-offer fixture and does not enter its Busy branch.
No synthetic-specific UI filtering or state-machine relaxation is necessary.

## Validation

- internal-ride-qa.spec.ts: offline/pre-offer feeds, no lock/realtime/notice, atomic
  offer representation, normal acceptance hook, cleanup at both stages, tamper rejection.
- internal-ride-qa.postgres.spec.ts: real isolated PostgreSQL create/offer/rollback,
  concurrent one-offer claim, actual work lock, both cleanup stages, phone constraint.
- node apps/rider-app/scripts/synthetic-preoffer-regression-check.js
- The same UI check can receive the exact Build 1 rider-app directory as an argument.
- Full backend suite, Captain regressions/location checks/typecheck, backend
  typecheck/build, diff and credential scans.

These are local checks. Production QA remains closed; physical offer/active-work
acceptance must be separately revalidated after an approved deployment/window.
Validated locally on 20 October 2026:
- Focused synthetic fixture unit suite: 39 passed.
- Isolated PostgreSQL suite: 17 passed, including concurrent offer and rollback.
- Full backend with PostgreSQL enabled: 1,410 passed, 98 skipped, 0 failed.
- Captain regressions, location/waypoint checks, UI pre-offer state checks against
  branch and exact Build 1 source, Captain/backend typechecks and backend build: PASS.
- Added-content credential scan and git diff check: PASS.
