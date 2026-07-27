# Task 203 Rides Controlled Pilot AAB Readiness

## Summary

Task 203 enables KariGO Rides for controlled pilot testing across Customer App, Admin Portal, backend and KariGO Captain. The next Customer and Captain production AABs should include the ride pilot changes before Play Internal Testing.

## Included Behaviour

- Customer App can open KariGO Rides from home.
- Customer can request fare estimate and submit ride request.
- Customer can view recent ride request status and cancel before pickup where allowed.
- Admin can monitor Pilot Ride Requests and manually assign Ride Captains.
- Captain App can show assigned ride trips and progress the trip lifecycle.
- Pending/rejected/non-approved Captains remain blocked from ride operations.
- Backend keeps ride auto-dispatch, ride payment and payout automation disabled.

## Build Profiles

Customer:

```text
Profile: customer-production
Package: com.karigo.customer
Channel: customer-production
Output: Android AAB
```

Captain:

```text
Profile: captain-production
Package: com.karigo.rider
Channel: captain-production
Output: Android AAB
```

## Public Build Flags

The EAS profiles now include:

```text
EXPO_PUBLIC_RIDES_SERVICE_ENABLED=true
EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED=true
EXPO_PUBLIC_TAXI_SERVICE_ENABLED=true
EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED=true
```

The `EXPO_PUBLIC_TAXI_*` values are retained as legacy aliases while the app code uses the new Rides naming.

## Backend Flags

Render should use:

```text
RIDES_SERVICE_ENABLED=true
RIDES_CONTROLLED_PILOT_ENABLED=true
RIDES_AUTO_DISPATCH_ENABLED=false
RIDES_PAYMENT_ENABLED=false
```

Legacy aliases may remain:

```text
TAXI_SERVICE_ENABLED=true
TAXI_STAGING_DISPATCH_ENABLED=true
```

## Fresh AAB Requirement

Fresh Customer and Captain AABs are required for Play Internal Testing because the public Rides flags and route copy are bundled into the mobile builds. EAS Update can help only when the installed binary reliably accepts the update.

Do not build production AABs inside Codex for this task.

## Pre-Upload Checks

- Backend redeployed with Rides flags.
- Admin Portal redeployed.
- Customer EAS Update published for smoke testing.
- Captain EAS Update published for smoke testing.
- Customer production AAB built after Task 203 commit.
- Captain production AAB built after Task 203 commit.
- No APK/AAB artifacts, direct artifact URLs, keystores or credentials committed.

## Known Limits

- Manual assignment only.
- No automatic matching.
- No ride payment collection.
- No ride payout automation.
- No wallet ride payment.
- No public ride marketing claim beyond controlled pilot testing.
