# KariGO Rides Controlled Pilot Runbook

## Purpose

KariGO Rides is enabled only for controlled pilot testing in selected areas. The pilot lets approved customers request rides, lets Admin manually assign approved Ride Captains, and lets approved Captains progress assigned ride trips.

This runbook does not approve public ride launch, automatic matching, in-app ride payment, driver payouts, wallet ride payment, or production app-store publishing.

## Pilot Scope

- Cities: Kano and Abuja
- Customer access: authenticated KariGO Customers only
- Captain access: approved Ride Captain pilot profiles only
- Dispatch mode: manual Admin assignment only
- Ride payment: disabled in app for this pilot
- Payout automation: disabled
- Auto-dispatch: disabled

## Backend Flags

Required Render backend flags for controlled pilot:

```text
RIDES_SERVICE_ENABLED=true
RIDES_CONTROLLED_PILOT_ENABLED=true
RIDES_AUTO_DISPATCH_ENABLED=false
RIDES_PAYMENT_ENABLED=false
```

Legacy aliases remain supported for older tooling:

```text
TAXI_SERVICE_ENABLED=true
TAXI_STAGING_DISPATCH_ENABLED=true
```

Do not enable automatic dispatch or ride payment unless a separate approved task introduces and verifies those flows.

## Mobile Public Flags

Fresh Customer and Captain builds should include:

```text
EXPO_PUBLIC_RIDES_SERVICE_ENABLED=true
EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED=true
```

Legacy public aliases remain supported:

```text
EXPO_PUBLIC_TAXI_SERVICE_ENABLED=true
EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED=true
```

## Customer Flow

1. Customer signs in.
2. Customer opens KariGO Rides from the home screen.
3. Customer enters pickup and destination.
4. Customer requests fare estimate.
5. Customer submits ride request.
6. Admin reviews the request and manually assigns a Ride Captain.
7. Customer can monitor trip status and cancel before pickup where allowed.

## Admin Flow

1. Open Admin Portal > Ride Operations.
2. Review Ride Captain applications and documents.
3. Prepare a Ride Captain profile from approved applications.
4. Set profile status to `ACTIVE_TEST` only when the Captain is approved for pilot rides.
5. Review Pilot Ride Requests.
6. Assign an available Ride Captain manually.
7. Monitor trip status history.
8. Cancel a ride only with an operational reason.

## Captain Flow

1. Approved Captain signs in to KariGO Captain.
2. Open Ride operations.
3. Go online for Rides.
4. Wait for Admin-assigned ride trips.
5. Accept assigned ride.
6. Mark arrived at pickup.
7. Start trip with customer PIN.
8. Mark arrived at destination.
9. Complete trip.

Pending, rejected or customer-only accounts must see:

```text
Ride operations will be available after KariGO approves your Captain account.
```

## Guardrails

- Captains cannot self-claim unassigned ride requests.
- Customers cannot read another customer's ride trip.
- Captains cannot act on trips assigned to another Captain.
- Closed ride trips cannot be progressed.
- Customer ride payment is disabled.
- Captain payout automation is disabled.
- Auto-dispatch is disabled.
- Internal module names may still use taxi for compatibility, but customer-facing copy should say KariGO Rides.

## Rollback

To disable pilot access:

```text
RIDES_CONTROLLED_PILOT_ENABLED=false
TAXI_STAGING_DISPATCH_ENABLED=false
```

Then publish Customer/Captain EAS updates or rebuild AABs if the disabled state must be bundled.
