# KariGO Soft Launch Release Runbook - Task 103

Date prepared: 2026-07-13

## Purpose

Provide a safe execution sequence for a controlled soft launch. This runbook assumes the
platform remains in staging/test mode unless management separately approves a limited
Paystack Test Mode checkout verification.

## Pre-Launch Sequence

1. Confirm management approval using `karigo-soft-launch-go-no-go-checklist-task103.md`.
2. Confirm backend health at `https://karigo-8htn.onrender.com/api/v1/health`.
3. Confirm Admin Portal loads at `https://admin.karigo.com.ng`.
4. Confirm Vendor Dashboard loads at `https://vendor.karigo.com.ng`.
5. Confirm public website loads at `https://www.karigo.com.ng`.
6. Confirm current Customer App build/update is installed on pilot devices.
7. Confirm current KariGO Captain App build/update is installed on pilot devices.
8. Confirm pilot credentials are shared only through the approved private channel.
9. Confirm mock providers remain active unless Paystack Test Mode is separately approved.
10. Confirm no live utility, SMS, payout, wallet refund, ride or Pharmacy flow is active.

## Pilot Day Start

| Step | Owner | Expected result |
| --- | --- | --- |
| Open operations channel | Operations Lead | All owners online and reachable |
| Confirm support queue | Support Lead | Support officer ready |
| Confirm dispatch board | Dispatch Lead | Ready orders and Delivery Captains visible |
| Confirm vendor availability | Operations Lead | Pilot vendors can receive orders |
| Confirm Delivery Captain availability | Dispatch Lead | Pilot captains can go online |
| Confirm issue log | QA Lead | Issue register ready before first test |
| Confirm evidence rules | QA Lead | No OTP/password/secret evidence recorded |

## First Controlled Order Flow

1. Customer creates a staged order.
2. Customer completes mock payment, or approved Paystack Test Mode if explicitly selected.
3. Vendor accepts and prepares the order.
4. Vendor marks ready for pickup.
5. Admin assigns Delivery Captain.
6. Delivery Captain accepts job.
7. Delivery Captain progresses pickup and delivery statuses.
8. Customer reveals delivery code only at eligible status.
9. Delivery Captain completes delivery with customer-supplied code.
10. Admin verifies final order status.
11. Vendor verifies settlement visibility.
12. Operations logs result in daily tracker.

## Monitoring During Pilot

Monitor every 30 to 60 minutes during active testing:

- Backend health.
- Login/session failures.
- Order creation and payment state.
- Vendor order acceptance and readiness timing.
- Dispatch assignment and reassignment.
- Delivery Captain job progression.
- Delivery code completion.
- Support tickets and customer complaints.
- Settlement and earning visibility.
- Any evidence of live-provider calls or secret exposure.

## Rollback / Pause Conditions

Pause the pilot immediately if any of these occur:

- Live payment, SMS, utility, payout, wallet withdrawal, automatic refund, live ride or
  Pharmacy flow activates unexpectedly.
- Any password, bearer token, OTP, delivery code, provider key or private customer data is exposed.
- Orders can be marked paid without backend verification.
- Delivery code is visible to vendor, admin, Captain or notifications.
- Cross-tenant vendor/customer/provider data is visible.
- Admin cannot monitor or control active orders.
- A P0/P1 issue is confirmed.

## End-Of-Day Close

1. Complete `karigo-soft-launch-daily-monitoring-tracker-task103.md`.
2. Update issue register with severity, owner and target fix date.
3. Confirm no unmasked sensitive evidence was saved to Git.
4. Decide: continue, continue with conditions, pause for fix, or stop pilot.
5. Share summary with management and operations.

