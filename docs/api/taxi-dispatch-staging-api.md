# Taxi Dispatch Staging API

All routes use the existing `/api/v1` prefix and response envelope. Taxi dispatch routes are staging-gated and must not be used for public production Taxi booking.

## Flags

Backend staging dispatch requires:

```text
TAXI_SERVICE_ENABLED=true
TAXI_STAGING_DISPATCH_ENABLED=true
```

If either flag is false, dispatch endpoints return a forbidden response and Taxi remains waitlist/readiness only.

## Public Fare Estimate

```text
POST /api/v1/taxi/fare-estimate
```

Body:

```json
{
  "pickupAddress": "Tarauni, Kano",
  "destinationAddress": "Zoo Road, Kano",
  "estimatedDistanceKm": 6.5,
  "estimatedDurationMin": 18
}
```

Returns:

- pickup address
- destination address
- estimated distance
- estimated duration
- estimated fare in kobo
- currency
- staging test-mode notice

## Customer Taxi Test Trips

Authenticated customer only:

```text
POST /api/v1/customer/taxi/fare-estimate
POST /api/v1/customer/taxi/trips
GET  /api/v1/customer/taxi/trips
GET  /api/v1/customer/taxi/trips/:tripId
POST /api/v1/customer/taxi/trips/:tripId/cancel
```

Rules:

- Customer must own the profile attached to the authenticated user.
- Trip request calculates fare server-side.
- Trip reference is generated server-side.
- Trip PIN is generated server-side.
- Raw trip PIN is returned only on creation.
- No payment is captured.
- Customer can view only their own trips.
- Customer cancellation is blocked for active started trips.

## Rider Taxi Test Mode

Authenticated rider only:

```text
GET  /api/v1/rider/taxi/profile
PATCH /api/v1/rider/taxi/availability
GET  /api/v1/rider/taxi/trips/available
POST /api/v1/rider/taxi/trips/:tripId/accept
POST /api/v1/rider/taxi/trips/:tripId/arrived-pickup
POST /api/v1/rider/taxi/trips/:tripId/start
POST /api/v1/rider/taxi/trips/:tripId/arrived-destination
POST /api/v1/rider/taxi/trips/:tripId/complete
POST /api/v1/rider/taxi/trips/:tripId/cancel
```

Rules:

- Rider must have an `ACTIVE_TEST` Taxi driver profile.
- Rider must be available to see available trips.
- Rider cannot accept more than one active Taxi trip.
- Trip lifecycle must progress in order.
- Starting the trip requires the correct customer trip PIN.
- Completing the trip clears the stored PIN hash.
- Existing delivery jobs remain separate.

## Admin Taxi Operations

Admin only:

```text
GET  /api/v1/admin/taxi/driver-profiles
POST /api/v1/admin/taxi/driver-profiles/from-application/:applicationId
PATCH /api/v1/admin/taxi/driver-profiles/:profileId/status
GET  /api/v1/admin/taxi/trips
GET  /api/v1/admin/taxi/trips/:tripId
PATCH /api/v1/admin/taxi/trips/:tripId/assign-driver
POST /api/v1/admin/taxi/trips/:tripId/cancel
GET  /api/v1/admin/taxi/summary
```

Rules:

- Admin can create profiles only from approved or provisionally approved applications.
- Admin can assign only active and available test drivers.
- Admin can cancel open test trips.
- Admin operations create audit records where appropriate.
- Admin sees trip events for operational review.
- Admin must not see raw trip PIN values.

## Statuses

Driver profile statuses:

- `PENDING_ACTIVATION`
- `ACTIVE_TEST`
- `SUSPENDED`
- `DEACTIVATED`

Trip statuses:

- `REQUESTED`
- `DRIVER_ASSIGNED`
- `ACCEPTED`
- `ARRIVED_PICKUP`
- `STARTED`
- `ARRIVED_DESTINATION`
- `COMPLETED`
- `CANCELLED_BY_CUSTOMER`
- `CANCELLED_BY_DRIVER`
- `CANCELLED_BY_ADMIN`
- `EXPIRED`

## Security Notes

- Taxi staging dispatch is disabled by default.
- The raw trip PIN is never stored.
- No real provider credentials are needed.
- No maps provider is connected.
- No live Taxi booking should be presented publicly.
- No real payment, wallet, cashout or settlement behavior is part of this API.
