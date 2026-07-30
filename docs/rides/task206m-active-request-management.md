# Task 206M - Active Ride Request Management

## Observed Issues

- The ride category Continue button could sit below the visible Android viewport on smaller devices.
- A customer could create several `REQUESTED` KariGO Rides because `REQUESTED` was not treated as active by the backend duplicate guard.
- The Customer app only managed the latest locally-created trip, leaving older active requests hard to open or cancel.
- Cancelled trips still used active tracking copy such as Captain search text and the generic request-received heading.

## Sticky Booking Actions

- `RideOptionsPanel` now scrolls category cards independently and keeps Continue fixed in a bottom action footer.
- `RideBookingDetails` keeps the final Request action fixed above the safe-area bottom inset.
- Scroll content includes extra bottom padding so the last card or detail field is not hidden behind the footer.
- Continue remains disabled when route/fare state is stale, no valid category is selected, or route data is missing.

## Lifecycle Classification

Active ride statuses:

- `REQUESTED`
- `DRIVER_ASSIGNED`
- `ACCEPTED`
- `ARRIVED_PICKUP`
- `STARTED`
- `ARRIVED_DESTINATION`

Terminal ride statuses:

- `COMPLETED`
- `CANCELLED_BY_CUSTOMER`
- `CANCELLED_BY_DRIVER`
- `CANCELLED_BY_ADMIN`
- `EXPIRED`

The Customer app uses shared lifecycle helpers from `@karigo/shared-types`. The backend uses the matching Prisma enum list.

## Duplicate Request Protection

- Backend trip creation now checks for an existing active customer trip inside a serializable transaction.
- If an active trip exists, the backend returns `409 ACTIVE_RIDE_EXISTS` with safe active-trip details.
- The Customer app disables repeated request presses with an in-flight guard and sends a non-secret `clientRequestId` for the same submit attempt.
- Without a new idempotency table, active-trip conflict enforcement is the no-migration idempotency approach for immediate rides.

## Multiple Active Trip Recovery

- KariGO Rides Home shows an `Active KariGO Ride` banner for one active trip.
- Multiple legacy active requests show a count and a dedicated `Active ride requests` list.
- Every active row has `Open ride`; cancellable statuses also show `Cancel request`.
- Cancelling one selected trip updates that exact trip and moves it into `Ride history` when terminal.
- Terminal trips remain available through `Ride history` and are not shown with cancellation actions.

## Tracking States

- `REQUESTED`: shows `Looking for a Ride Captain` and concise matching copy.
- Assigned/accepted states show Captain and vehicle details only when backend driver data exists.
- Trip PIN is not shown on cancelled/expired/completed trips, and is only shown when a verified assigned Captain is at or beyond pickup.
- Cancelled trips show `Ride request cancelled`, route summary, reference, and options to book another ride or return home.
- Completed and expired states use terminal-specific copy and do not show Captain-search progress.

## Refresh Behaviour

- Active tracking refreshes every 25 seconds while the app is foregrounded.
- Polling pauses in the background, prevents overlapping refresh calls, and stops when the tracked trip becomes terminal.
- Manual Refresh remains available.
- Leaving tracking through Close or Back to KariGO Home does not cancel the ride.

## Deployment Steps

1. Deploy backend to Render so duplicate-request enforcement and selected-trip cancellation are authoritative.
2. Publish Customer OTA:

   ```powershell
   cd apps/customer-app
   npx eas-cli update --channel customer-production --environment production --platform android --message "fix: refine active rides and sticky booking actions" --non-interactive
   ```

3. No native dependency was added, so a fresh AAB is not required for this task.

## Rollback

- Revert the Task 206M commit.
- Redeploy backend.
- Publish a Customer OTA from the previous accepted commit.
- Confirm ride creation/cancellation still works before re-opening tests.

## Real-Device Acceptance

- Open KariGO Rides with existing multiple `REQUESTED` rides.
- Confirm `Active ride requests` lists each active request.
- Open and cancel the first active request.
- Return to active requests and cancel the second request.
- Confirm cancelled trips move to `Ride history`.
- Create one new ride, then rapidly tap Request several times.
- Confirm only one active ride is created and duplicate attempts open the active ride.
- Confirm cancelled screens do not show Captain-search copy or the ride PIN.
- Confirm Continue and Request actions remain above Android navigation controls.
- Confirm Close/Back to KariGO allows use of other services without cancelling the ride.
