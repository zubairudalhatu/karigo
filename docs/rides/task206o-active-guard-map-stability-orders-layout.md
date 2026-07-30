# Task 206O - Active Guard, Map Stability and Orders Layout

## Purpose

Task 206O hardens the Task 206N Rides experience after real-device testing. It keeps the Customer App OTA-only and does not change backend ride APIs, fare calculation, Prisma schema, or native dependencies.

The fixes cover:

- stable map address selection;
- authoritative active-Ride tracking;
- responsive Orders -> Rides history cards;
- consistent ride fare display from kobo minor units.

## Map Blinking Root Cause

The map picker stored the loading sentence `Updating selected address...` directly inside the selected map point every time `onRegionChangeComplete` fired. The picker also passed a controlled `region` prop, so state updates could feed back into map camera events. Small camera changes and programmatic camera adjustments could therefore repeatedly replace the visible address with loading copy even after the map stopped moving.

## Reverse-Geocode Fix

The Customer map picker now separates:

- current map camera coordinate;
- selected centre-pin coordinate;
- last reverse-geocoded coordinate;
- pending reverse-geocode request;
- last valid selected address.

Implementation notes:

- The picker uses `initialRegion` plus imperative map movement instead of a continuously controlled `region`.
- `mapResolvingAddress` controls the `Updating selected address...` copy.
- The selected `mapPoint.address` is not overwritten with loading text.
- `reverseGeocodeDebounceMs` is set to `550`.
- `mapMovementThresholdMeters` is set to `14`, so tiny camera changes do not trigger another lookup.
- `mapReverseGeocodeRequest` is incremented for each lookup generation, so stale responses are ignored.
- Pending timers are cleared when the picker closes or confirms a location.

If reverse geocoding fails, the selected coordinate remains available and the customer sees a safe retryable note instead of a request loop.

## Active-Ride Guard Root Cause

Task 206N added an active-trip check, but the screen still had route-planning state in memory. On some navigation paths, a previously mounted Rides screen could briefly render `Where to?` or `Choose destination` before active-trip reconciliation finished.

## Booking-State Override

The Rides screen now uses an explicit entry state:

```text
checking
active
clear
failed
```

While checking:

- the booking UI is not rendered;
- `Where to?`, route planning, categories and fare controls are hidden.

When the active-trip check fails:

- the app shows a retry screen;
- the booking UI remains blocked to avoid duplicate ride creation.

When a preferred active ride exists:

- the screen opens tracking;
- stale `HOME`, `ROUTE`, `CONFIRM` and `DETAILS` transitions are guarded by `enforceActiveRideTracking`;
- map picking, fare preview, fare estimate, create-trip, and Android back transitions all check the active ride first.

Home and Close still return to the wider KariGO Home. Re-entering KariGO Rides reconciles with the backend again and reopens tracking while the ride is active.

## Ride History Responsive Layout

Orders -> Rides now uses a local responsive `RideStatusBadge` for ride cards. This avoids forcing a long trip reference and a long status into one fixed horizontal row.

Card hierarchy:

- trip reference;
- sentence-case ride status;
- concise pickup to destination;
- ride category and fare;
- requested date/time;
- action button.

Long statuses such as `Cancelled by customer` and `Cancelled by admin` wrap inside the card, with no horizontal page scrolling or clipped badge.

## Currency-Unit Root Cause

Backend ride fields use kobo minor units:

- `estimatedFareKobo`;
- `finalFareKobo`;
- ride-category `fareRangeKobo`.

Tracking had a local kobo formatter, but Orders -> Rides used the generic commerce `money()` formatter, which treats values as major naira. That made a `568400` kobo ride display as `NGN 568,400` instead of `₦5,684`.

## Shared Ride Money Formatter

The Customer app now has a ride-specific formatter:

```text
apps/customer-app/src/lib/rides-format.ts
```

It provides:

- `formatRideFareKobo`
- `formatRideFareRangeKobo`
- `rideStatusLabel`

Ride tracking, ride fare ranges, Orders -> Rides rows, and Ride details use the same formatter. Commerce order totals continue to use the existing commerce formatter.

This task does not change fare calculation or backend fare authority.

## Deployment Steps

Expected deployment:

1. Push Task 206O to `main`.
2. Publish Customer OTA:

```powershell
cd apps/customer-app
npx eas-cli update --channel customer-production --environment production --platform android --message "fix: stabilise ride navigation and history layout" --non-interactive
```

No fresh AAB is expected because no native dependency or app config changed.

## Rollback Steps

If the OTA causes a serious ride regression:

1. Revert the Task 206O commit.
2. Publish a new Customer OTA to `customer-production`.
3. Confirm Rides can open, active ride tracking still works, and Orders remain available.

Do not roll back backend duplicate-ride protection or selected-trip cancellation.

## Real-Device Acceptance Checklist

Map picker:

- Open `Destination on map`.
- Stop moving the map.
- Confirm `Updating selected address...` does not repeatedly blink.
- Move the map once.
- Confirm one updating state appears.
- Confirm the resolved address remains stable.
- Confirm location selection still works.

Active ride:

- Create one immediate ride.
- Confirm tracking displays `Looking for a Ride Captain`.
- Tap Home or Close.
- Return to wider KariGO Home.
- Tap KariGO Rides.
- Confirm tracking opens directly.
- Confirm `Choose destination` does not appear.
- Background and reopen the app.
- Confirm tracking remains authoritative.
- Cancel the ride.
- Leave the terminal screen.
- Reopen KariGO Rides.
- Confirm normal booking is restored.

Orders:

- Open Orders -> Rides.
- Confirm long cancellation statuses remain inside cards.
- Confirm no horizontal overflow.
- Confirm cancelled ride fare displays correctly.
- Verify a `₦5,684` ride is not shown as `NGN 568,400`.
- Confirm Ride details display the same fare.
- Confirm commerce Orders remain unchanged.

Acceptance remains pending until versionCode 13 receives this update through OTA without reinstalling.
