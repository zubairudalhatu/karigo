# Task 206N - Rides Tracking and Orders Polish

## Purpose

Task 206N simplifies the KariGO Rides customer journey after Task 206K and Task 206M real-device testing. The change keeps the map-first ride flow, but removes duplicate destination entry, prevents customers from seeing the booking form while an immediate ride is active, and moves ride management into the existing Orders area.

Backend APIs were already sufficient for this work:

- `GET /api/v1/customer/taxi/trips`
- `GET /api/v1/customer/taxi/trips/:tripId`
- `POST /api/v1/customer/taxi/trips/:tripId/cancel`

No database merge is introduced. Commerce orders and ride trips remain separate backend entities.

## Destination Input Fix

Observed issue:

- Tapping `Where to?` opened route planning with a destination row and a second standalone `Search destination` field.

Customer fix:

- The active route row now owns the `TextInput`.
- Destination, pickup, and stop rows use the same inline row input mechanism.
- Only one route field can be active at a time.
- Places suggestions, Google attribution, recent destinations, saved places, map selection, debounce, stale route clearing, and automatic route/fare preview remain intact.

Final route planning structure:

```text
Pickup
[current pickup address or pickup input]

Destination
[inline destination TextInput]

Suggestions / Recent destinations / Saved places
```

## Active Ride Entry Guard

Whenever the customer enters KariGO Rides, the Customer App now checks active trips first.

If an active immediate ride exists:

- the preferred active trip opens directly in tracking;
- Ride Home, destination planning, ride categories, and new immediate booking are not shown;
- top actions return to KariGO Home instead of the booking screen.

If multiple legacy active rides exist:

- the preferred operational trip opens in tracking;
- tracking shows a compact notice with a `Manage rides` action;
- `Manage rides` opens Orders -> Rides so each active request can be inspected or cancelled individually.

If no active ride exists:

- the normal map-first `Where to?` booking experience is available.

## Tracking Screen Cleanup

Tracking now focuses only on the selected trip.

It keeps:

- ride reference;
- status;
- pickup and destination;
- category and fare/estimate;
- Captain details only after assignment;
- ride PIN only when operationally needed;
- cancellation before pickup when eligible;
- `Back to KariGO Home`;
- `View all rides` / `Manage rides`.

It removes:

- active ride list;
- ride history list;
- historical cancelled/completed/expired entries;
- duplicate requested-state copy.

## Captain Search Progress

REQUESTED rides now show an honest indeterminate search treatment:

- title: `Looking for a Ride Captain`;
- supporting text: `Connecting you with available Captains nearby.`;
- animated scanning bar built with React Native `Animated`;
- accessibility label: `Searching for an available KariGO Ride Captain.`;
- no fake countdown, percentage, or Captain availability claim.

The animation stops on component unmount and pauses when the app leaves the foreground.

## Orders -> Rides Integration

The existing Customer Orders screen now has:

- `Orders` tab for commerce orders;
- `Rides` tab for KariGO Rides.

The Rides tab contains:

- `Active rides`;
- `Ride history`;
- terminal ride details.

Active ride actions:

- `View status` opens `/taxi/request?tripId=<tripId>`;
- `Cancel request` cancels the selected trip ID only.

Terminal ride details show:

- trip reference;
- status;
- route summary;
- category;
- fare;
- payment preference when available;
- requested and closed time;
- cancellation reason when available;
- `Book another ride` only when no active ride blocks new booking.

## Customer Home

Home now shows a compact active ride entry when a ride is active:

```text
Active KariGO Ride
Looking for a Captain / Ride Captain assigned / Ride in progress
View status
```

The KariGO Rides category also changes its small status label to `Active ride` while a ride is active.

## Deployment Steps

Expected deployment for Task 206N:

1. Merge/push the Customer app changes to `main`.
2. Publish Customer OTA:

```powershell
cd apps/customer-app
npx eas-cli update --channel customer-production --environment production --platform android --message "refactor: simplify rides tracking and orders history" --non-interactive
```

3. No fresh AAB is expected because no native dependency or app config change is introduced.
4. No backend redeploy is expected.
5. No Prisma migration is expected.

## Rollback

If real-device testing finds a serious Rides regression:

1. Revert the Task 206N commit.
2. Publish a Customer OTA to `customer-production`.
3. Verify KariGO Rides opens normally.
4. Verify active trip cancellation still works from the restored flow.

Do not roll back backend ride duplicate-protection or selected-trip cancellation.

## Real-Device Acceptance Checklist

Destination input:

- Open KariGO Rides with no active ride.
- Tap `Where to?`.
- Confirm the destination row itself receives the cursor.
- Confirm there is no second destination search field.
- Type a destination and select a suggestion.
- Confirm route and fares calculate automatically.

Active ride:

- Create one immediate ride.
- Confirm REQUESTED tracking shows the animated search indicator.
- Confirm Ride history is absent from tracking.
- Tap the left header action and confirm it returns to KariGO Home.
- Re-enter KariGO Rides and confirm tracking opens directly.
- Confirm the booking form is not shown while the ride is active.
- Open Orders -> Rides and confirm the active ride appears.
- Cancel the active ride and confirm it moves to Ride history.
- Re-enter KariGO Rides and confirm normal booking returns.

Orders:

- Confirm existing commerce orders remain visible.
- Confirm the Rides tab appears.
- Confirm active and historical rides are separated.
- Confirm an active ride opens tracking.
- Confirm a terminal ride opens details.
- Confirm multiple active legacy rides can be cancelled individually.

Acceptance remains pending until versionCode 13 receives the OTA and passes real-device testing.
