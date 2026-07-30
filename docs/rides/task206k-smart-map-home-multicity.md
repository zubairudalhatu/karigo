# Task 206K - Smart Map-First Rides Home and Kano/Abuja Support

## Summary

Task 206K simplifies the Customer App KariGO Rides booking surface after Task 206J-R1 route and fare acceptance.

The new flow keeps the accepted backend route/fare engine, but changes the customer experience to:

1. Open KariGO Rides on a map-first screen.
2. Use current location as pickup automatically when foreground permission already exists.
3. Show one prominent `Where to?` destination action.
4. Show a compact `Later` scheduled-ride action.
5. Show up to three recent destinations and concise saved places.
6. Automatically request route preview and fare estimate after a resolved destination is selected.
7. Show ride category cards and a single `Continue` action.
8. Keep optional details collapsed until the final request step.

## Bottom Panel States

The Customer Rides screen uses React Native `Animated` and `PanResponder` only. No native bottom-sheet dependency was added.

Panel states:

- `collapsed`: keeps the map more visible.
- `half`: default home/options height.
- `expanded`: search and booking-details mode.

The panel respects safe-area padding and keeps the map current-location button outside the sheet.

## Default Pickup

On screen open, the Customer App checks existing foreground location permission with `getForegroundPermissionsAsync`.

- If permission is already granted, the app gets the current location, reverse-geocodes it, stores it as pickup, and centers the map.
- If permission is not granted, the app does not repeatedly prompt. It shows compact copy and lets the customer choose pickup manually.
- If the customer taps the GPS action, the app may request foreground location permission.

## Destination-First Flow

`Where to?` opens the destination search immediately. Pickup remains a compact row and can be edited only when needed.

Search continues to use the backend Google Places proxy:

- `GET /api/v1/customer/taxi/places/autocomplete`
- `GET /api/v1/customer/taxi/places/details/:placeId`

Google attribution remains visible for predictions.

## Automatic Route and Fare

After a resolved pickup and destination exist, the Customer App:

1. Clears stale route and fare state.
2. Calls backend route preview.
3. Decodes the returned Google Routes polyline.
4. Fits the route on the map.
5. Calls backend fare estimate with the returned route distance and duration.
6. Shows ride categories.

The Customer App does not fabricate routes or fares. Backend route/fare remains authoritative.

## Routed Stop

Task 206K supports one optional stop.

Rules:

- Add Stop is hidden until pickup and destination are meaningful.
- Stop search uses Google Places through the backend proxy.
- A stop must resolve to coordinates.
- The stop is passed to route preview as an intermediate waypoint.
- The routed distance/duration returned by backend route preview are used for fare estimation.
- The selected stop is included in the final trip customer note for operations.

No Prisma migration was added because the current trip schema has no dedicated stop columns.

Google Routes reference: https://developers.google.com/maps/documentation/routes/intermed_waypoints

## Kano and Abuja Service Areas

Backend now supports plural active Ride service areas:

```text
RIDES_ACTIVE_SERVICE_AREAS=Abuja,Kano
```

Backward compatibility remains:

```text
RIDES_ACTIVE_SERVICE_AREA=Abuja
```

The plural variable takes precedence when it contains at least one supported city. Supported cities for this phase:

- Abuja
- Kano

The shared resolver handles:

- comma-separated values;
- whitespace;
- duplicate values;
- case differences;
- malformed plural config fallback;
- coordinate resolution by service-area radius;
- text alias fallback for safe fare checks.

## Cross-City Protection

KariGO Rides remains a city-rides service in this phase.

Backend rejects:

- Abuja pickup to Kano destination;
- Kano pickup to Abuja destination;
- a stop in a different supported city;
- pickup/destination/stop outside active supported areas.

Customer copy:

```text
Intercity KariGO Rides are not available yet. Choose pickup and destination within the same city.
```

## Environment

Expected Render env:

```text
RIDES_ACTIVE_SERVICE_AREAS=Abuja,Kano
GOOGLE_MAPS_SERVER_API_KEY=<existing Render secret>
GOOGLE_ROUTES_TIMEOUT_MS=12000
```

Do not put the server-side Google Maps key into EAS or mobile app config.

## Deployment

Required:

1. Redeploy Render backend.
2. Publish Customer OTA:

```powershell
cd apps/customer-app
npx eas-cli update --channel customer-production --environment production --platform android
```

Not required:

- Fresh Customer AAB
- Admin Vercel redeploy
- Vendor Vercel redeploy
- Prisma migration
- Render Shell

## Rollback

1. Revert the Task 206K commit.
2. Redeploy backend.
3. Publish a Customer OTA on `customer-production`.
4. If city config causes unexpected blocking, temporarily set:

```text
RIDES_ACTIVE_SERVICE_AREAS=Abuja
```

or restore the previous singular setting until the issue is reviewed.

## Real-Device Acceptance

### Abuja

1. Keep the current Play/internal-testing binary installed.
2. Open KariGO Rides.
3. Confirm the map opens first.
4. Confirm current location becomes pickup automatically when permission already exists.
5. Confirm only `Where to?` is prominent at first.
6. Select an Abuja recent/saved/search destination.
7. Confirm route and fares load automatically.
8. Confirm category cards and `Continue` appear.
9. Edit pickup.
10. Choose pickup/destination on the map.
11. Add one routed stop.
12. Test `Later`.
13. Submit a controlled ride request.
14. Confirm `REQUESTED` status and trip PIN.

### Kano

1. Use a Kano device location or approved Kano test pickup.
2. Confirm the active area resolves to Kano.
3. Confirm the screen does not say Abuja.
4. Select Kano pickup and Kano destination.
5. Confirm road route and fare estimates.
6. Submit a controlled test ride request.

### Cross-City

1. Select Abuja pickup.
2. Select Kano destination.
3. Confirm normal city fare is blocked.
4. Confirm the intercity-not-yet-available message appears.

Do not mark acceptance complete until real-device evidence confirms the OTA behaviour.
