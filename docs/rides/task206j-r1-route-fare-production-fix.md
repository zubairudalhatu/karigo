# Task 206J-R1 Route and Fare Production Fix

## Production Symptom

Real-device Task 206L acceptance confirmed that the installed Customer app can load the production OTA, render native Google Maps, detect GPS, select pickup and destination points, and resolve Google Places autocomplete/details through the backend proxy.

The remaining defect was route preview. After valid pickup and destination coordinates were selected, the Customer app returned:

```text
Route estimate temporarily unavailable. Please retry.
```

That blocked road polyline rendering, distance/duration display, ride-category fare cards, category selection and progression into booking review.

## Root Cause

The backend `customer/taxi/routes/preview` Google Routes request was using the same short timeout as Places requests and was sending `departureTime: new Date().toISOString()` for immediate rides.

For immediate "leave now" rides, the repair omits `departureTime` so Google Routes uses the request time automatically. This avoids a server-side race where a timestamp created before transit to Google may be treated as a past departure for a `DRIVE` request.

No live provider log containing an exact Google status was available in the workspace. The new backend logs will identify safe provider status/reason fields such as `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `quota_or_rate_limit`, `timeout`, `provider_5xx`, empty routes, missing distance, missing duration and missing polyline without logging keys, headers, exact coordinates or addresses.

Production Google Cloud configuration still needs to confirm the backend server key has these APIs enabled and allowed:

- Places API (New)
- Routes API
- Geocoding API, only where still used by backend flows

The backend must continue using `GOOGLE_MAPS_SERVER_API_KEY` only. The Android key must stay in EAS/mobile build configuration and must not be used by the backend.

## Request Correction

Immediate route preview now sends:

- `travelMode: DRIVE`
- `routingPreference: TRAFFIC_AWARE`
- `computeAlternativeRoutes: false`
- `polylineQuality: OVERVIEW`
- `polylineEncoding: ENCODED_POLYLINE`
- metric units
- encoded overview polyline field mask
- no `departureTime`

A helper exists for future scheduled route-preview support, but the current Customer route-preview DTO does not expose scheduled ride preview behaviour.

## Timeout Policy

Places autocomplete/details keep the existing short timeout.

Route preview uses a route-specific timeout:

```text
GOOGLE_ROUTES_TIMEOUT_MS
```

Safe default:

```text
12000
```

Validation bounds:

```text
minimum 3000
maximum 15000
```

The request still uses an abort controller and cannot hang indefinitely.

## Fallback Policy

Primary route mode:

```text
TRAFFIC_AWARE
```

One controlled fallback may run:

```text
TRAFFIC_UNAWARE
```

Fallback is allowed only for retryable operational failures:

- route timeout
- Google/provider 5xx or unavailable status
- unusable traffic-aware duration response

Fallback is not used for:

- invalid API key
- permission failure
- Routes API disabled
- invalid/malformed coordinates
- quota/rate limit
- empty routes/no real route
- missing polyline

Fallback still depends on Google Routes returning a real road route, real road distance, real duration and encoded polyline. No straight-line or fabricated route is used.

The backend response identifies:

- `routingPreference`
- `durationSource`
- `fallbackApplied`

## Route-To-Fare Sequence

The Customer app still uses the backend as source of truth:

1. Customer selects pickup and destination.
2. Customer calls authenticated route preview.
3. Backend returns road distance, duration and encoded polyline.
4. Customer calls backend fare estimate with the route distance and duration.
5. Backend returns ride categories and fare estimates.
6. Customer selects a category.
7. Booking is blocked if the fare estimate no longer matches the current route preview/category.

Typed pickup/destination changes now clear old route and fare estimates to avoid stale fare display.

## Validation Results

- Prisma validate: not required; no schema change
- Prisma generate: not required; no schema change
- Backend typecheck: passed
- Backend build: passed
- Focused taxi maps tests: passed, 17 tests
- Focused fare-estimate tests: passed through `taxi.service.spec.ts`, 21 tests
- Complete backend tests: passed, 66 suites / 554 tests
- Customer typecheck: passed
- Customer regression: passed
- Expo config validation: passed; package `com.karigo.customer`, scheme `karigo-customer`, versionCode `13`, runtime `0.1.0`, production API base `https://karigo-8htn.onrender.com/api/v1`
- Expo Doctor: passed, 18/18 checks
- Secret scan: passed on changed Task 206J-R1 files
- Artifact URL scan: passed on changed Task 206J-R1 files
- `git diff --check`: passed
- `git diff --cached --check`: passed

## Deployment Steps

Expected deployment impact:

- Render backend redeploy: required
- Customer production OTA: required only because the Customer app stale-estimate guard changed
- Fresh Customer AAB: not required
- Google Play upload: not required
- Admin/Vendor redeploy: not required
- Prisma migration: not required
- Render Shell: not required

Customer OTA should be published to `customer-production` with production environment if the Customer app change is deployed.

## Real-Device Acceptance Checklist

Do not mark acceptance complete until real-device evidence confirms road route and non-zero fare estimates.

1. Keep Customer versionCode 13 installed.
2. Open KariGO Rides in Abuja.
3. Set a valid current pickup.
4. Select a valid destination several kilometres away.
5. Tap Preview route.
6. Confirm the route follows roads.
7. Confirm kilometre distance appears.
8. Confirm realistic driving duration appears.
9. Confirm all active ride categories display fare estimates.
10. Change the destination and confirm the old estimate clears.
11. Preview again and confirm a new fare is returned.
12. Confirm no crash.
13. Confirm no new AAB was installed.

## Guardrails

- Do not implement Task 206K multi-city behaviour in this repair.
- Do not change Kano/Abuja service-area configuration.
- Do not introduce automated dispatch.
- Do not activate card or wallet ride payment.
- Do not alter Captain assignment.
- Do not expose API keys, tokens, private coordinates, full addresses or provider payloads.
- Do not fabricate route geometry or fare values.
