# Rider App Staging Refresh Audit - Task 95

Date: 2026-07-12

Scope: `apps/rider-app`, Rider staging build/QA documentation.

## Summary

The Rider App was refreshed for staging readiness against the current KariGO delivery
workflow. This audit did not activate live payouts, rider withdrawals, live taxi booking,
live payments, provider login, Pharmacy marketplace, or any new payment flow.

## Confirmed Configuration

- Staging API: `https://karigo-8htn.onrender.com/api/v1`
- App name: `KariGO Rider Staging`
- Android package: `com.karigo.rider.staging`
- iOS bundle identifier: `com.karigo.rider.staging`
- EAS project ID: `344a78dc-69d9-4daa-9616-f100b67f0910`
- EAS Update URL: `https://u.expo.dev/344a78dc-69d9-4daa-9616-f100b67f0910`
- Build profile: `rider-staging`
- Distribution: internal Android APK

## Refresh Items Completed

- Rider login now includes a show/hide password control.
- Rider dashboard now surfaces rider name, availability, today's assigned deliveries,
  active delivery, completed delivery count, support/help guidance and a staging safety note.
- Rider job list supports pull-to-refresh.
- Rider job detail supports pull-to-refresh and clearer delivery action language.
- Reject-job reasons use controlled rider-facing choices.
- Delivery OTP entry now appears only after the job is marked `DELIVERED`.
- Rider App still does not fetch or display customer delivery OTPs.
- Taxi remains readiness/test-mode only and is not live booking.
- Mock/staging mode messaging remains explicit.

## Delivery Flow Audit

Expected backend-authoritative flow:

1. Admin assigns rider: `RIDER_ASSIGNED`.
2. Rider accepts job: `RIDER_ARRIVING_PICKUP`.
3. Rider confirms pickup: `PICKED_UP`.
4. Rider starts delivery: `ON_THE_WAY`.
5. Rider confirms arrival: `ARRIVED_DESTINATION`.
6. Rider marks delivered: `DELIVERED`.
7. Rider enters the customer-supplied OTP.
8. Backend completes the order: `COMPLETED`.

Security note: the Rider App accepts the OTP only as customer-supplied input. It must not
retrieve, display, log or store the delivery OTP.

## Remaining Manual QA

- Install/update the current Rider staging build or EAS update.
- Login with the secure demo rider credential from the controlled handover.
- Confirm the dashboard summary with live staging data.
- Run one assigned-order delivery through valid and invalid OTP cases.
- Confirm earnings and notifications after completion.
- Record evidence in `docs/qa/rider-app-staging-test-evidence.md` without passwords,
  tokens, full phone numbers, OTPs or private device identifiers.
