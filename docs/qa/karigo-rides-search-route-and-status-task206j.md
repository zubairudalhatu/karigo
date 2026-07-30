# KariGO Rides Search, Route and Status QA - Task 206J

## Scope

This record verifies the Task 206J KariGO Rides booking polish:

- Backend-proxied Google Places search.
- Backend-proxied Google Place Details.
- Backend-proxied Google Routes road route preview.
- Clean Customer App ride wording.
- Fixed center-pin map selection.
- Backend-driven status copy.

Do not mark live ride acceptance complete from repository validation alone. Real-device acceptance is required after backend deploy and Customer OTA update.

## Backend Verification

| Check | Expected Result | Result |
| --- | --- | --- |
| Backend health | `GET /api/v1/health` returns healthy | Pending |
| Places autocomplete | Authenticated customer receives safe predictions for Abuja searches | Pending |
| Place details | Selected `placeId` resolves to address and coordinates | Pending |
| Route preview | Pickup/destination returns distance, duration and encoded polyline | Pending |
| Missing key handling | Search/route return safe unavailable message, no secret output | Pending |
| Rate limiting | Excessive search requests return a safe 429 response | Pending |

## Customer App Verification

| Check | Expected Result | Result |
| --- | --- | --- |
| Rides home copy | Shows `Live rides in Abuja` or configured active city | Pending |
| New booking reset | Pickup/destination are empty at the start of a new booking | Pending |
| Pickup search | Search predictions appear for pickup query | Pending |
| Destination search | Search predictions appear for destination query | Pending |
| Google attribution | Prediction list includes Google attribution | Pending |
| Place selection | Selected prediction fills address and coordinates | Pending |
| Map picker | Full-screen map uses a fixed center pin | Pending |
| Current location | Bottom-right GPS button moves map to current location | Pending |
| Route preview | Map draws a road polyline route, not a straight line | Pending |
| Route unavailable | Safe retry message appears if provider route is unavailable | Pending |
| Fare estimate | Fare categories load after a successful route preview | Pending |
| Trip creation | Ride request creates through backend | Pending |
| Status copy | No driver-assigned wording appears until backend returns a driver | Pending |

## Negative Checks

- Customer Rides booking surface should not show repeated `Controlled pilot` wording.
- Customer Rides booking surface should not say KariGO Operations manually assigns the ride.
- Customer Rides booking surface should not show `Driver found` unless a driver is actually present in backend trip data.
- Customer App must not call Google Places or Routes directly with a server key.
- Customer App must not use Expo Router or internal navigation for external provider URLs in this task.

## Google Maps Configuration

Backend key:

- `GOOGLE_MAPS_SERVER_API_KEY`

Mobile/native map key:

- `GOOGLE_MAPS_ANDROID_API_KEY`

Never paste real key values into this record. Confirm only that keys are configured in Render/EAS approved environment storage.

## Acceptance Status

Repository validation status:

- Prisma validate/generate: Passed
- Backend typecheck/build/tests: Passed
- Customer typecheck/regression/Expo config/Expo Doctor: Passed
- Secret scan: Passed, broad scan found placeholders/env names only
- Artifact URL scan: Passed
- Git diff checks: Passed

Real-device acceptance status:

- Pending after backend redeploy and Customer OTA update.
