# KariGO Rides Production Manual Dispatch Runbook

## Purpose

This runbook explains how KariGO Operations should run the first production manual Ride dispatch flow. It assumes Kano and Abuja are active service areas and automatic matching is disabled.

## Pre-Dispatch Checks

Confirm backend environment names, without exposing values:

- `RIDES_SERVICE_ENABLED`
- `RIDES_PRODUCTION_ENABLED`
- `RIDES_DISPATCH_MODE`
- `RIDES_ACTIVE_SERVICE_AREAS`
- `RIDES_ASSIGNMENT_ACCEPTANCE_SECONDS`
- `RIDES_CAPTAIN_LOCATION_STALE_SECONDS`
- `RIDES_REQUEST_EXPIRY_MINUTES`
- `RIDES_AUTO_DISPATCH_ENABLED`
- `RIDES_PAYMENT_ENABLED`

Required values for launch:

- `RIDES_DISPATCH_MODE=MANUAL`
- `RIDES_ACTIVE_SERVICE_AREAS=Abuja,Kano`
- `RIDES_AUTO_DISPATCH_ENABLED=false`
- `RIDES_PAYMENT_ENABLED=false`

## Captain Eligibility

Assign only Captains who meet all conditions:

- KariGO account is active.
- Phone is verified.
- Ride Captain application is approved.
- Required Ride documents are approved.
- Ride profile is `ACTIVE`.
- Captain is online for Ride.
- Location is recent and valid.
- Operating area matches pickup service area.
- No active Delivery or Ride lock exists.
- No suspension or deleted account status exists.

If the Admin page says a Captain is eligible but backend assignment returns a conflict, refresh the board. Backend eligibility is the final authority.

## Dispatch Steps

1. Open Admin Portal.
2. Go to KariGO Ride Dispatch.
3. Review the Awaiting assignment section.
4. Open eligible Captains for the selected Ride.
5. Confirm pickup, destination, service area, fare estimate and payment mode.
6. Select an eligible Captain.
7. Assign the Captain.
8. Confirm the Ride moves to Awaiting Captain acceptance.
9. Confirm the Captain app shows the assignment.
10. Monitor acceptance or decline.

## Captain Acceptance

If Captain accepts:

1. Ride moves to Accepted.
2. Customer sees the Captain on the way.
3. Captain marks arrived at pickup.
4. Customer provides Ride PIN.
5. Captain enters correct PIN.
6. Ride moves to Started.

If Captain declines:

1. Ride returns to Awaiting assignment when still valid.
2. Cross-mode work lock is released.
3. Admin assigns another eligible Captain.

If Captain does not accept within the configured timeout:

1. Assignment expires.
2. Ride returns to Awaiting assignment if the request itself is still valid.
3. Captain becomes available according to saved preferences.

## Cross-Mode Lock Handling

When a Captain receives a Delivery assignment:

- Delivery becomes Busy.
- Ride becomes Paused.
- Ride Dispatch must not assign that Captain.

When a Captain receives a Ride assignment:

- Ride becomes Busy.
- Delivery becomes Paused.
- Delivery dispatch must not assign that Captain.

The lock is released only after decline, timeout, cancellation, reassignment release or completion.

## Cancellations

Customer cancellation is allowed only before Ride start according to policy. Captain cancellation requires a reason and should prefer reassignment when possible. Admin cancellation requires a mandatory reason and should be recorded with the operational context.

## Payment Guardrail

For this launch phase, Ride payment remains operationally controlled. Do not enable card collection, wallet debit, automated gateway capture, cashout or payout automation from Ride screens.

## Incident Handling

Use this order during incidents:

1. Confirm backend health.
2. Confirm Ride config.
3. Confirm Captain account/profile/document status.
4. Confirm current Captain work-state.
5. Confirm location freshness.
6. Refresh Admin Dispatch.
7. If assignment conflict persists, cancel or release the active assignment through approved Admin flow.
8. If a customer is stuck in Finding Captain, expire or cancel the Ride safely and ask the customer to retry.

## Rollback

Pause customer Ride creation by setting `RIDES_PRODUCTION_ENABLED=false`, then redeploy or restart backend if required by the hosting environment. Keep existing records; do not delete trips, work-state, applications or uploaded documents.
