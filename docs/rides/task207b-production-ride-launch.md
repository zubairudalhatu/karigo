# Task 207B Production Ride Launch Record

## Scope

Task 207B moves KariGO Rides from controlled pilot wording into production-ready manual operations for Kano and Abuja. It does not enable automatic matching, card/wallet Ride billing, payout automation, or unapproved Captain access.

## Production Configuration

Backend-owned configuration is authoritative:

- `RIDES_SERVICE_ENABLED=true`
- `RIDES_PRODUCTION_ENABLED=true`
- `RIDES_DISPATCH_MODE=MANUAL`
- `RIDES_ACTIVE_SERVICE_AREAS=Abuja,Kano`
- `RIDES_ASSIGNMENT_ACCEPTANCE_SECONDS=45`
- `RIDES_CAPTAIN_LOCATION_STALE_SECONDS=90`
- `RIDES_REQUEST_EXPIRY_MINUTES=10`
- `RIDES_AUTO_DISPATCH_ENABLED=false`
- `RIDES_PAYMENT_ENABLED=false`

Legacy `RIDES_CONTROLLED_PILOT_ENABLED` and `TAXI_STAGING_DISPATCH_ENABLED` aliases are retained only for installed-runtime compatibility. New deployments should use the production `RIDES_*` names.

## Profile Status Migration

Ride Captain profile status now uses:

- `PENDING_ACTIVATION`
- `ACTIVE`
- `SUSPENDED`
- `DEACTIVATED`

The Prisma migration converts existing `ACTIVE_TEST` records to `ACTIVE` and defaults newly created Ride trips to production mode. Application approval still does not automatically activate Ride Captain operations.

## Customer Ride Lifecycle

Customer Ride requests remain map-first:

1. Customer confirms pickup, destination, category and fare estimate.
2. Backend validates active service area and locks the fare snapshot.
3. Ride is created as `REQUESTED`.
4. Admin assigns an eligible Ride Captain.
5. Captain accepts or declines.
6. Customer tracks assignment, arrival, Ride PIN, started trip and completion.

Customer-facing labels must use clean production text such as:

- Finding a KariGO Captain
- A Captain has been assigned
- Your Captain is on the way
- Your Captain has arrived
- Ride in progress
- Ride completed

Backend enum names should not be exposed directly on customer screens.

## Captain Operations

Approved and activated Ride Captains may go online only when:

- account is active;
- phone is verified;
- Ride application is approved;
- required documents are approved;
- Ride profile is `ACTIVE`;
- operating area is active;
- foreground location is valid and recent;
- no active cross-mode work lock exists.

Foreground location is captured only when the Captain goes online or refreshes availability. The implementation uses existing native location modules already embedded in the Captain app, so Task 207B is OTA-compatible for Captain when no separate native change is introduced.

## Dual-Mode Availability

Captains can independently choose desired availability for Delivery and Ride:

- Delivery offline, Ride offline
- Delivery online, Ride offline
- Delivery offline, Ride online
- Delivery online, Ride online

Backend `CaptainWorkState` stores desired availability separately from effective availability. When a Delivery or Ride assignment is offered, the backend acquires a cross-mode lock immediately and pauses the other mode until the work reaches a release state.

The lock stages are:

- `OFFERED`
- `ASSIGNED`
- `ACCEPTED`
- `IN_PROGRESS`

The lock prevents a Captain from receiving Delivery and Ride assignments at the same time. When the assignment is declined, cancelled, expired or completed, the backend restores the Captain's saved desired availability where still eligible.

## Manual Dispatch

Initial production dispatch is manual:

- Admin sees requested Rides in KariGO Ride Dispatch.
- Admin opens eligible Captains.
- Backend repeats eligibility inside the assignment path.
- Assignment moves the Ride to `DRIVER_ASSIGNED`.
- Captain must accept before the Ride proceeds.

Automatic matching remains disabled.

## Payment Mode

Initial Ride payment remains operationally controlled. Cash may be shown where approved. No card collection, wallet debit, automated gateway capture, payout automation, or cashout action is enabled by this task.

## Application Trash

Rejected Delivery Captain and Ride Captain applications can be moved to soft Trash by Admin with a mandatory reason. Trash does not delete the KariGO account, documents, profiles, orders or Ride history. Restore is supported. Permanent purge remains disabled until a retention policy is approved.

## Delivery Revision

Delivery Captain applications in revision-required states now expose a targeted document revision flow in the Captain app. The revision flow:

- loads the existing application;
- preserves the original reference;
- uploads requested documents through secure upload infrastructure;
- submits updates to the same application;
- does not reopen or change the Ride Captain application.

For `KGO-CAPTAIN-2026-8D3355`, ownership can be linked only when the verified KariGO account match is unambiguous. Ambiguous matches require Admin review.

## Deployment Impact

- Backend redeploy: required.
- Prisma migration: required.
- Admin Portal redeploy: required.
- Customer production OTA: required after backend/Admin acceptance.
- Captain OTA: required when using existing native modules.
- Fresh Captain AAB: not required by this task because no new native dependency was introduced.
- Vendor, Partner and Website redeploys: not required.

## Rollback

1. Set `RIDES_PRODUCTION_ENABLED=false`.
2. Keep `RIDES_AUTO_DISPATCH_ENABLED=false` and `RIDES_PAYMENT_ENABLED=false`.
3. Redeploy backend if environment changes require it.
4. Keep Admin trash records and `CaptainWorkState` data; do not reverse the migration unless a database rollback window is explicitly approved.
5. Remove Customer/Captain Ride entry points through OTA if production Ride access must be paused.

## Real-Device Acceptance

Do not declare KariGO Rides live until the acceptance checklist in `docs/qa/task207b-production-ride-acceptance.md` passes on real devices.
