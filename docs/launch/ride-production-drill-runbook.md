# Ride controlled production drill runbook

## Preconditions

- The city is Kano or Abuja and Rides is owner-confirmed as `OPERATIONS_ONLY`.
- The controlled Customer and Ride Captain are enabled and city/service matched.
- The Captain has fresh GPS, no active assignment, an active Ride profile, valid vehicle data, and approved evidence.
- Manual assignment, support coverage, pause control, and reconciliation ownership are confirmed.

## Success path

1. Create the Ride drill record and select the controlled participants.
2. Captain goes online for Ride during the communicated window.
3. Customer creates the request; Admin sees it and the eligible Captain.
4. Admin assigns manually; Captain receives and accepts.
5. Customer verifies the displayed Captain and vehicle.
6. Captain progresses to pickup and marks arrival.
7. Confirm the Ride PIN appears only at `ARRIVED_PICKUP`; do not copy the PIN into evidence.
8. Captain verifies the PIN, starts, reaches the destination, and completes.
9. Verify receipt, Captain earning, audit timeline, exclusive-lock release, and intended availability.
10. Mark each drill step, attach only a non-secret reference, and record reconciliation.

## Failure cases

Exercise decline, assignment expiry, allowed customer cancellation before/after assignment, Operations cancellation, stale location, and pause during active work. A pause must allow the active Ride to finish safely while blocking new Ride requests. Record any assignment-lock failure as critical.

Automatic matching remains disabled. Do not expose a PIN, credentials, tokens, payment data, or private URLs.
