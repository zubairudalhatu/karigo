# KariGO Rides Live Booking and Map Operations - Task 206J

## Purpose

Task 206J upgrades KariGO Rides from local address guessing to a server-proxied Google Places and Routes flow for Customer App ride booking.

The Customer App remains client-safe:

- Android Maps SDK key stays in EAS/build configuration for native map rendering.
- Google Places and Routes server key stays on the backend only.
- The mobile app never receives or logs `GOOGLE_MAPS_SERVER_API_KEY`.

## Live Service Copy

Customer surfaces should use launch-ready wording:

- `Live rides in Abuja`
- `Available in Abuja`
- `Service availability may vary by area and time.`

Avoid repeating internal wording such as controlled pilot, manual assignment, staging dispatch, or readiness warnings on normal ride booking surfaces.

## Backend Proxy Endpoints

Authenticated Customer endpoints:

- `GET /api/v1/customer/taxi/places/autocomplete`
- `GET /api/v1/customer/taxi/places/details/:placeId`
- `POST /api/v1/customer/taxi/routes/preview`

The backend calls:

- Google Places API (New) Autocomplete
- Google Places API (New) Place Details
- Google Routes API Compute Routes

## Required Backend Environment

Set in Render or approved secret manager only:

- `GOOGLE_MAPS_SERVER_API_KEY`
- `RIDES_ACTIVE_SERVICE_AREA`

Recommended service area value for current launch:

- `Abuja`

Do not commit API keys, `.env` files, screenshots, request payload dumps, or provider response payloads.

## Routing Behaviour

The Customer App should:

- Search pickup and destination through the backend Places proxy.
- Resolve selected predictions through backend Place Details.
- Preview a traffic-aware road route through backend Routes.
- Draw the encoded Google route polyline on the native map.
- Show a safe retry message if route estimate is temporarily unavailable.
- Require route preview before fare estimate and trip request.
- Reset pickup/destination state for each new booking.

## Deployment Order

1. Deploy backend with Task 206J changes.
2. Confirm backend health.
3. Confirm `GOOGLE_MAPS_SERVER_API_KEY` is configured in Render.
4. Publish Customer OTA update to `customer-production`.
5. Verify on a real device.

Fresh Customer AAB is not required unless native map configuration or dependencies change.

## Rollback

If Google provider access fails after deploy:

1. Keep ride booking available only if the current Customer App can show safe route/search errors.
2. Confirm backend logs show safe reason only, not secrets.
3. Verify `GOOGLE_MAPS_SERVER_API_KEY` and Google Cloud API enablement.
4. Roll back backend to the previous healthy deployment if search/route failures block normal app use.
5. Publish a Customer OTA rollback if the app UI has a blocking regression.

## Real-Device Smoke Checks

- Open KariGO Rides.
- Confirm home copy says live rides in the active city.
- Start a new booking and confirm pickup/destination fields are empty.
- Search pickup and destination.
- Confirm predictions appear with Google attribution.
- Select suggestions and confirm route preview draws a road route, not a straight line.
- Use the map picker and confirm the fixed center pin works.
- Tap the current-location button on the map picker.
- Confirm fare categories appear after route preview.
- Create a ride request.
- Confirm tracking says an available Ride Captain is being found until backend assignment exists.
