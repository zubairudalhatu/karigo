# Task 206P - Customer Ride Lifecycle and Captain Handoff

## Scope

Task 206P finalises the Customer-side KariGO Rides lifecycle presentation and prepares the safe backend/shared-type contract for the Captain app phase. It does not implement automated dispatch, matching, wallet/card Ride payments, or the Captain mobile app.

## Lifecycle Statuses

The repository uses the existing `TaxiTripStatus` values:

| Status | Customer presentation | Active | Terminal | Customer cancel | Captain/vehicle | PIN | Polling | Receipt/book another |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `REQUESTED` | Looking for a Ride Captain | Yes | No | Yes | Hidden | Hidden | Yes | No |
| `DRIVER_ASSIGNED` | Ride Captain assigned | Yes | No | Yes | Visible only when relationship is valid | Hidden/masked | Yes | No |
| `ACCEPTED` | Your Ride Captain is on the way | Yes | No | Yes | Visible only when relationship is valid | Hidden/masked | Yes | No |
| `ARRIVED_PICKUP` | Your Ride Captain has arrived | Yes | No | No | Visible | Visible to owning Customer only | Yes | No |
| `STARTED` | Ride in progress | Yes | No | No | Visible | Hidden/cleared | Yes | No |
| `ARRIVED_DESTINATION` | Destination reached | Yes | No | No | Visible | Hidden | Yes | No |
| `COMPLETED` | Ride completed | No | Yes | No | Visible if assigned | Hidden | No | Yes |
| `CANCELLED_BY_CUSTOMER` | Ride request cancelled | No | Yes | No | Visible if assigned | Hidden | No | Yes |
| `CANCELLED_BY_DRIVER` | Ride request cancelled | No | Yes | No | Visible if assigned | Hidden | No | Yes |
| `CANCELLED_BY_ADMIN` | Ride request cancelled | No | Yes | No | Visible if assigned | Hidden | No | Yes |
| `EXPIRED` | Ride request expired | No | Yes | No | Hidden | Hidden | No | Yes |

The shared contract lives in `packages/shared-types/src/taxi.ts` as `taxiTripLifecycle` and `taxiLifecycleForStatus`.

## Public Captain Projection

Customer and future Captain-facing contracts use a concise `captain` projection:

- Captain profile ID and optional user ID.
- Display name.
- Optional profile photo URL when available.
- Verified flag based on active approved Ride Captain profile status.
- Optional public rating/completed-trip count placeholders.
- Contact capability and phone only where controlled pilot calling is permitted.
- Last verified location only when present, with `fresh` or `stale` freshness.

The projection does not expose driver licence numbers, identity documents, bank details, home address, internal review notes, passwords, tokens, or private onboarding documents.

## Vehicle Projection

Customer and future Captain contracts use a `vehicle` projection:

- Make, model, colour.
- Registration number.
- Category.
- Seat capacity derived from the approved vehicle type.
- Optional vehicle photo URL when available.

## Assignment Integrity

The backend does not fabricate Captain data. If a status indicates assignment but the `TaxiDriverProfile` relationship is missing, Customer responses set `assignmentIncomplete=true`, return `captain=null` and `vehicle=null`, and log a safe operational warning with trip ID and status only.

## PIN Policy

Ride PINs are generated server-side with six random digits. The backend stores:

- bcrypt hash for verification.
- encrypted PIN for the owning Customer reveal at `ARRIVED_PICKUP`.
- last four digits for Admin operational reference.

Customer responses:

- `REQUESTED`, `DRIVER_ASSIGNED`, `ACCEPTED`: no full PIN.
- `ARRIVED_PICKUP`: full PIN is returned only to the owning Customer when decryptable.
- `STARTED` and terminal statuses: no PIN.
- Orders/Rides history never displays or shares the PIN.

Captain APIs must never expose the stored PIN. The Captain app should accept a Customer-provided PIN and the backend must compare it against the hash.

## Captain PIN Verification Contract

Existing Rider/Captain backend transition support already includes:

`POST /api/v1/rider/taxi/trips/:tripId/start`

Rules:

- Authenticated assigned Captain only.
- Trip must belong to the Captain.
- Trip must be `ARRIVED_PICKUP`.
- Submitted PIN must match the server hash.
- Incorrect PIN is rejected.
- Terminal trips cannot be started.
- Successful verification transitions the trip to `STARTED`, records `startedAt`, creates an event, and clears the retrievable encrypted PIN.

Future hardening for Task 207A should add explicit rate limiting and clearer PIN-attempt audit metadata before broader Ride rollout.

## Location Freshness

Customer UI may show Captain location only when the backend returns coordinates and `lastSeenAt`.

- Fresh: `lastSeenAt` within 120 seconds.
- Stale: older than 120 seconds.
- Unavailable: no verified coordinates or timestamp.

The app does not fabricate Captain movement or animate vehicles without verified Captain coordinates.

## Tracking Refresh

The Customer tracking screen uses lifecycle-aware foreground polling:

- `REQUESTED`: moderate search refresh.
- `DRIVER_ASSIGNED` / `ACCEPTED`: faster assignment and ETA refresh.
- `ARRIVED_PICKUP`: pickup status refresh.
- `STARTED`: trip-progress refresh.
- Terminal statuses: polling stops.

Polling pauses in background, resumes in foreground, prevents overlapping requests, ignores stale responses, and keeps manual refresh available.

## Receipt and Timeline

Customer Ride records include:

- KariGO Ride reference.
- Status and lifecycle copy.
- Pickup and destination.
- Distance and duration when present.
- Ride category.
- Captain and vehicle when assigned.
- Estimated or final fare, clearly labelled.
- Cash payment method.
- Requested, assigned, accepted, arrived, started, destination, completed, cancelled, or expired timestamps when backed by backend data/events.

Cancelled and expired rides are shown as Ride records, not paid final receipts.

## Future Captain API Handoff

Task 207A should use these contracts for:

- List assigned/available Ride offers.
- View Ride offer.
- Accept or decline assigned/available Ride.
- Update Captain availability.
- Update foreground Captain location.
- Mark arrived at pickup.
- Verify Customer PIN and start Ride.
- Mark arrived at destination.
- Complete Ride.
- Cancel with permitted reason.
- View active Ride.
- View Captain Ride history.

Do not expose stored PINs, private Captain documents, bank details, or unrelated user fields in Captain responses.

## Native Push Notification Readiness

No native push dependency was added in Task 206P. Native push notification support will require a later task and may require a fresh AAB depending on the selected provider and permissions.

## Deployment

Expected deployment after Task 206P:

- Render backend redeploy: required.
- Prisma migration: required for nullable `tripPinEncrypted`.
- Render shell/migration command: required to apply the migration.
- Customer OTA: required.
- Fresh Customer AAB: not required because no native dependency/config change was added.
- Admin Vercel redeploy: not required unless Admin Ride controls are separately changed.
- Vendor deploy: not required.

## Rollback

1. Revert the Task 206P commit.
2. Redeploy backend.
3. Publish a Customer OTA from the reverted Customer bundle.
4. If needed, leave the nullable `tripPinEncrypted` column in place; it is inert when not used.
5. Run Ride create, tracking, Orders/Rides and cancellation smoke checks.

## Real-Device Acceptance Checklist

Use existing Admin/manual controls until the Captain app phase is complete.

- `REQUESTED`: create Ride, confirm search state, no Captain, no PIN.
- `DRIVER_ASSIGNED`: assign a valid test Captain, confirm Captain and vehicle appear, search animation stops.
- `ACCEPTED`: confirm on-the-way copy and masked PIN.
- `ARRIVED_PICKUP`: confirm PIN appears and safety copy is visible.
- `STARTED`: confirm PIN disappears, Ride-in-progress copy appears, cancellation is removed.
- `ARRIVED_DESTINATION`: confirm destination-reached copy without premature completion.
- `COMPLETED`: confirm receipt, timeline, View in Orders and Book another Ride.
- Cancelled/expired: confirm terminal record, no PIN, safe cancellation reason.
- Home, KariGO Rides and Orders must show the same active/terminal state.
- Validate on small Android screens.

Real-device acceptance remains pending until versionCode 13 receives the OTA and the full lifecycle is exercised.
