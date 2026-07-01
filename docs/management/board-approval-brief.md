# KariGO MVP, Staging And Controlled Soft Launch Approval Brief

## Purpose Of Approval

Request documented direction on the internal demo, staging environment, proposed Kano
pilot, resources, onboarding, promotion, provider sandbox tests, and legal/policy work.

## Current Build Status

The NestJS/PostgreSQL backend, customer app, rider app, vendor dashboard, and admin portal
exist. The mock-provider MVP has passed 120 automated tests and a 24-check live smoke
journey. It is ready for internal demonstration and staging preparation, not public use.

## Completed And Demonstrated

The demo covers customer ordering, promo and mock payment; vendor fulfilment; admin
dispatch; rider delivery with OTP; support; refunds; notifications; reports;
settlements; and earnings.

## Proposed Pilot

Kano only, selected zones, limited verified vendors/riders, invite-only customers,
controlled operating hours, manual oversight, and daily management review. Initial zone
priorities are proposals in `docs/launch/soft-launch-zones.md` and require capacity checks.

## Pilot Groups

- Vendors: limited businesses with verified details, trained dashboard users, confirmed
  products/prices/availability, signed agreements, and a successful test order.
- Riders: limited verified riders with approved vehicles, safety/app training, assigned
  zones/shifts, and a successful test delivery.
- Customers: invite-only participants inside approved zones who receive clear pilot,
  payment, service-limit, support, and feedback information.

## Providers And Roadmap

Payment, OTP/SMS, email, WhatsApp, push, and bank payouts remain mocked. Paystack is the
recommended first payment sandbox and Termii the recommended first OTP sandbox, subject
to approval, credentials outside Git, testing, security controls, and reconciliation.

## Readiness And Blockers

Operational templates and governance exist, but real-customer launch remains blocked by
production infrastructure, provider certification, hardened web sessions, physical-device
QA, operational rehearsal, vendor/rider onboarding, and legal/privacy/security approval.

## Operational Readiness

Runbooks, onboarding checklists, escalation, incident, KPI, daily reporting, feedback,
communications, and expansion controls exist. Named staff, real partners, shifts,
capacity targets, support contacts, and rehearsals are still pending approval.

## Technical Readiness

The mock-provider MVP is verified for internal demonstration. Staging deployment is
recommended. Production infrastructure, certified providers, secure dashboard sessions,
monitoring/backups, and physical-device/browser evidence remain incomplete.

## Legal And Policy Readiness

Terms, Privacy Policy, Refund Policy, Vendor Agreement, Rider Agreement, data-protection
review, and final marketing/provider consent wording require formal legal approval before
real-customer activity.

## Risks And Mitigations

Critical risks include downtime/data loss, payment/OTP failure, capacity gaps, support
overload, financial errors, and policy/privacy gaps. Existing registers assign mitigation
owners and require evidence before launch approval.

## Decisions Requested

1. Internal demo approval.
2. Staging deployment approval.
3. Controlled Kano soft-launch approval, deferred until checklist conditions close.
4. Pilot budget and operating-resource approval.
5. Initial vendor and rider onboarding approval.
6. Customer launch-promotion approval.
7. Payment and OTP sandbox-provider approval.
8. Legal/policy review-process approval.

## Approval Table

| Decision item | Approve / Decline / Defer | Comments/conditions | Approver | Signature | Date |
| --- | --- | --- | --- | --- | --- |
| Internal demo |  |  |  |  |  |
| Staging deployment |  |  |  |  |  |
| Controlled Kano pilot |  |  |  |  |  |
| Budget/resources |  |  |  |  |  |
| Vendor/rider onboarding |  |  |  |  |  |
| Customer promotion |  |  |  |  |  |
| Paystack/Termii sandbox testing |  |  |  |  |  |
| Legal/policy review |  |  |  |  |  |
