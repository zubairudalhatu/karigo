# Taxi Dispatch Staging Infrastructure

KariGO Taxi dispatch is prepared as staging infrastructure only. It is not public, not production-live, and not connected to real payments, maps billing, wallets, cashout, emergency services, insurance, government verification, or external ride-hailing providers.

## Feature Flags

Taxi dispatch must remain disabled unless all required staging flags are explicitly enabled.

Backend:

```text
TAXI_SERVICE_ENABLED=false
TAXI_STAGING_DISPATCH_ENABLED=false
```

Customer and Rider apps:

```text
EXPO_PUBLIC_TAXI_SERVICE_ENABLED=false
EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED=false
```

Default behavior is `false`. In production, `TAXI_STAGING_DISPATCH_ENABLED=true` is blocked by environment validation.

## Disabled Behavior

When Taxi staging dispatch is disabled:

- Customers see Taxi as coming soon and can join the waitlist.
- Riders see Taxi Driver Readiness only.
- Admins can review Taxi driver applications and waitlist records.
- No customer can create Taxi trips.
- No driver can accept or progress Taxi trips.
- No live dispatch, payment or external maps workflow is active.

## Staging Test Behavior

When Taxi staging dispatch is enabled in staging:

- Customers can create `Test Taxi Trip` requests.
- Approved Taxi test drivers can toggle staging availability.
- Drivers can accept available test trips and progress the trip lifecycle.
- Trip start requires the customer-provided trip PIN.
- Admins can create driver profiles from approved applications, assign test drivers, monitor trip events and cancel test trips.
- The UI must clearly say: `Taxi is running in staging test mode. No real taxi ride or payment is guaranteed.`

## Data Model

Task 57 adds separate Taxi data structures:

- `TaxiDriverProfile`: staging driver profile created from an approved Taxi driver application.
- `TaxiTrip`: customer Taxi test trip, separate from delivery orders.
- `TaxiTripEvent`: auditable trip lifecycle event log.

Taxi trips do not share delivery order status, payment capture, rider earnings or vendor settlement flows.

## Fare Engine

The fare engine is a staging-only internal formula. No Google Maps, Mapbox or external billing provider is connected.

Default formula in kobo:

- Base fare: `70000`
- Per km: `25000`
- Per minute: `4000`
- Minimum fare: `120000`

The fare estimate is not a live commercial fare policy. It exists only to validate staging trip screens, admin monitoring and driver workflow.

## Trip PIN

Trip start requires a six-digit customer trip PIN.

- The raw PIN is returned only at trip creation to the authenticated customer.
- The backend stores only a hash and a safe last-four display.
- Drivers submit the customer-provided PIN to start the trip.
- Admin only sees last-four where useful for staging support.
- The PIN must not be sent in notifications, logs, vendor screens or public docs.

## Live Launch Requirements

Before public Taxi launch, KariGO must complete:

- Legal and regulatory clearance.
- Driver identity verification.
- Driver licence validation.
- Vehicle inspection.
- Insurance and compliance review.
- Approved fare policy.
- Maps/geolocation provider selection and billing approval.
- Emergency/SOS process.
- Customer and driver terms.
- Cancellation/refund rules.
- Support and incident response readiness.
- Management approval to enable production Taxi booking.
