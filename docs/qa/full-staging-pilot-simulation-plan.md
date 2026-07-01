# Full Staging Pilot Simulation Plan

## Simulation Objective

Validate the complete KariGO MVP operating journey across the customer app, vendor
dashboard, rider app, admin portal, and backend API before any controlled Kano soft
launch is approved.

This plan is a staging-only rehearsal plan. A scenario must be marked `Passed` only when
it has been executed in the intended environment and evidence has been recorded.

## Simulation Scope

- Customer registration and login
- OTP verification through mock OTP or approved sandbox SMS only
- Address creation in a supported Kano pilot zone
- Vendor browsing and product/cart flow
- `KARIGOFIRST` promo validation
- Order creation
- Payment initiation and verification through mock payment or approved sandbox payment
- Vendor acceptance, preparation, and ready-for-pickup workflow
- Admin rider assignment
- Rider pickup, delivery status updates, and delivery OTP completion
- Customer support ticket flow
- Refund request and admin approval workflow
- In-app notifications and optional approved sandbox provider notifications
- Vendor settlement visibility
- Rider earnings visibility
- Admin dashboard and reporting

## Environment Rules

- Use staging or local demo accounts only.
- Use mock providers unless sandbox credentials are securely configured in staging.
- Do not record OTP values, full phone numbers, payment keys, device tokens, or private
  customer/vendor/rider data.
- Mask screenshots and log references before recording evidence.
- Keep `PAYMENT_PROVIDER`, `OTP_PROVIDER`, `EMAIL_PROVIDER`, `WHATSAPP_PROVIDER`, and
  `PUSH_PROVIDER` on `mock` unless the matching sandbox decision log is approved.

## Primary Scenario

Use `docs/qa/full-staging-primary-scenario.md` as the single happy-path rehearsal from
customer registration through completed delivery, support, refund, settlement, and
reporting.

## Supporting Negative Scenarios

Use `docs/qa/full-staging-negative-scenarios.md` for failure, abuse, duplicate-event, and
access-control tests.

## Evidence Requirements

Record every executed scenario in
`docs/qa/full-staging-simulation-evidence-register.md` or an access-controlled external
evidence store. The repository evidence register should contain masked references only.

Minimum evidence for each executed scenario:

- Environment and date/time
- Tester
- Order, ticket, refund, or notification reference where applicable
- Expected result
- Actual result
- Pass, fail, or blocked status
- Screenshot/log reference with sensitive data masked
- Follow-up issue or blocker ID if failed

## Entry Criteria

- Backend builds and tests pass.
- Customer app, rider app, vendor dashboard, and admin portal can point to the staging API.
- Staging seed data contains a demo admin, customer, vendor, rider, products, and
  `KARIGOFIRST` promo.
- Mock providers are confirmed available.
- Any sandbox provider used has an approved activation decision log.
- Test accounts and evidence handling are approved by the responsible leads.

## Exit Criteria

- Primary scenario has no critical failure.
- Negative scenarios do not reveal critical access-control, payment, OTP, refund, or
  order-status defects.
- All failures have issue IDs, owners, severity, target dates, and retest requirements.
- Go/no-go scoring has been completed in
  `docs/launch/go-no-go-readiness-scoring-matrix.md`.
- Final recommendation is recorded in
  `docs/launch/full-staging-go-no-go-readiness-report.md`.

## Current Task 37 Status

As of Task 37, this repository contains the plan, checklists, and automated build/test
evidence. A true full staging simulation is **blocked** until a deployed staging
environment, approved demo/test accounts, provider decisions, physical mobile testing,
and management sign-off are available.
