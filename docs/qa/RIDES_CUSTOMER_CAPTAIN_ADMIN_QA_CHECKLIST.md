# KariGO Rides Customer Captain Admin QA Checklist

## Preconditions

- Backend health returns OK.
- `RIDES_SERVICE_ENABLED=true`.
- `RIDES_CONTROLLED_PILOT_ENABLED=true`.
- `RIDES_AUTO_DISPATCH_ENABLED=false`.
- `RIDES_PAYMENT_ENABLED=false`.
- Customer and Captain apps use the current production API base.
- Customer and Captain apps include the public Rides pilot flags.
- Test data contains one Customer, one approved Ride Captain profile, and one pending/rejected Captain applicant.

## Customer Ride Request

| Step | Expected Result | Status |
| --- | --- | --- |
| Open Customer App home | KariGO Rides tile shows controlled pilot copy | Pending |
| Open KariGO Rides | Request screen opens for authenticated user | Pending |
| Enter pickup and destination | Form accepts safe address text | Pending |
| Request fare estimate | Backend estimate returns NGN amount and pilot notice | Pending |
| Submit ride request | Ride request is created with `REQUESTED` status | Pending |
| View status | Recent ride requests show reference, fare, status and assignment state | Pending |
| Cancel before pickup | Eligible pre-pickup ride can be cancelled by customer | Pending |

## Admin Manual Assignment

| Step | Expected Result | Status |
| --- | --- | --- |
| Open Admin > Ride Operations | Controlled pilot note is visible | Pending |
| Review Ride Applications | Applications, account readiness and document evidence are visible | Pending |
| Prepare profile from approved application | Ride Captain profile is prepared without enabling payouts/payments | Pending |
| Set profile `ACTIVE_TEST` | Profile becomes available for manual pilot assignment | Pending |
| Open Pilot Ride Requests | Customer ride request appears | Pending |
| Assign Ride Captain | Request status moves to `DRIVER_ASSIGNED` | Pending |
| View timeline | Status event records assignment | Pending |

## Captain Ride Operations

| Step | Expected Result | Status |
| --- | --- | --- |
| Approved Captain opens Ride operations | Pilot safety copy appears | Pending |
| Go online for Rides | Availability updates successfully | Pending |
| View assigned trips | Only manually assigned trips appear | Pending |
| Accept assigned ride | Status moves to `ACCEPTED` | Pending |
| Mark arrived at pickup | Status moves to `ARRIVED_PICKUP` | Pending |
| Start with customer PIN | Correct PIN starts trip; wrong PIN is rejected | Pending |
| Mark arrived at destination | Status moves to `ARRIVED_DESTINATION` | Pending |
| Complete trip | Status moves to `COMPLETED`; no payout is created | Pending |
| Cancel assigned ride | Allowed active status can be cancelled with reason | Pending |

## Blocked Access

| Scenario | Expected Result | Status |
| --- | --- | --- |
| Pending Captain applicant opens Ride operations | Shows approval blocked copy | Pending |
| Rejected Captain applicant opens Ride operations | Shows approval blocked copy | Pending |
| Customer-only user opens Captain ride operations | Shows approval blocked copy | Pending |
| Captain tries another Captain's trip | Backend rejects access | Pending |
| Captain tries unassigned ride | Backend rejects self-claiming | Pending |
| Customer tries another customer's ride | Backend returns not found/forbidden safe response | Pending |

## Payment and Payout Guardrails

| Check | Expected Result | Status |
| --- | --- | --- |
| Customer Ride request | No pay-now or wallet ride payment action appears | Pending |
| Admin Ride Operations | No payout, wallet transfer or auto-dispatch action appears | Pending |
| Captain Ride Operations | No cashout, payout or payment collection action appears | Pending |
| Backend flags | `RIDES_AUTO_DISPATCH_ENABLED=false`, `RIDES_PAYMENT_ENABLED=false` | Pending |

## Signoff

- Customer ride request QA: Pending
- Admin manual assignment QA: Pending
- Captain ride completion QA: Pending
- Blocked access QA: Pending
- Payment/payout guardrails QA: Pending
- Controlled pilot decision: Pending
