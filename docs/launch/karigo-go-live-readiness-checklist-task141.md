# Task 141 - KariGO Go-Live Readiness Checklist

## Purpose

This checklist prepares KariGO for a controlled go-live decision. It does not
approve public production launch, activate live payments, enable wallet top-up,
automatic refunds, live rides, payouts, Accelerate.ng utilities, Pharmacy
marketplace, public provider login or marketing/bulk messaging.

## Current Readiness Snapshot

| Area | Current Status | Go-Live Position |
| --- | --- | --- |
| Customer App | Main design and flows tested | Requires final release-candidate signoff |
| Admin Portal | Working | Requires production access and role audit |
| Vendor Dashboard | Working | Requires vendor onboarding and support readiness |
| Public Website | Working | Requires final legal/public-copy review |
| SME Services | Request flow, provider application and admin review working | Pilot-ready as manual review workflow only |
| Mock payment | Working for staging checkout | Safe fallback remains required |
| Paystack, Monnify, Squad | Sandbox foundations exist but currently fail safely unless configured | Not ready for live activation |
| Wallet | Ledger/view foundation only | No live funding, withdrawal or automatic refund |
| Rides | Readiness-only | Not live |
| Utilities | Accelerate.ng future integration | Not live |

## Decision Owners

| Area | Owner | Required Signoff |
| --- | --- | --- |
| Product scope | Product Lead |  |
| Engineering release | Technical Lead |  |
| Payment activation | Finance Lead + Technical Lead |  |
| Operations readiness | Operations Lead |  |
| Support readiness | Support Lead |  |
| Vendor readiness | Vendor Operations Lead |  |
| Captain readiness | Dispatch/Captain Operations Lead |  |
| Legal/privacy | Legal/Data Protection Reviewer |  |
| Final go-live approval | Management |  |

## Product Readiness Gates

- [ ] Customer App release candidate installed and tested on approved devices.
- [ ] KariGO Captain App release candidate installed and tested for delivery flow.
- [ ] Admin Portal production domain and access tested.
- [ ] Vendor Dashboard production domain and access tested.
- [ ] Public website production domain tested.
- [ ] Customer registration, OTP, login and account activation tested.
- [ ] Customer browse, cart, checkout, order tracking and support tested.
- [ ] Vendor order acceptance/preparation workflow tested.
- [ ] Admin dispatch and Delivery Captain completion workflow tested.
- [ ] Delivery code flow tested without exposing OTPs in logs/evidence.
- [ ] SME Services remains manual review/coordination only.
- [ ] No P0/P1 defects open.

## Operations Readiness Gates

- [ ] Launch city/zone approved.
- [ ] Launch hours and pause rules approved.
- [ ] Vendors confirmed, trained and reachable.
- [ ] Delivery Captains verified, trained and reachable.
- [ ] Admin/operations users assigned and trained.
- [ ] Support coverage schedule approved.
- [ ] Incident escalation channel active.
- [ ] Refund/complaint handling process approved.
- [ ] Daily reporting owner assigned.
- [ ] Manual fallback process approved for payment/provider downtime.

## Payment Readiness Gates

- [ ] Mock payment fallback confirmed.
- [ ] Selected first live payment provider formally approved.
- [ ] Sandbox provider has passed end-to-end checkout, verify and webhook tests.
- [ ] Live credentials are stored only in the production secret manager.
- [ ] No provider secret, webhook secret, card detail or private key is in Git.
- [ ] Live callback URL and webhook URL are configured and verified.
- [ ] Finance reconciliation owner and daily process approved.
- [ ] Refund policy and manual refund workflow approved.
- [ ] Chargeback/dispute handling owner assigned.
- [ ] Production payment cutover and rollback plan approved.

## Infrastructure Readiness Gates

- [ ] Production backend deployment health endpoint passes.
- [ ] Production database migrated with clean migration status.
- [ ] Backup and restore procedure verified.
- [ ] Production CORS allows only approved origins.
- [ ] Production environment variables reviewed by Technical Lead.
- [ ] Logs/monitoring are accessible to authorized operators.
- [ ] Error alerting or manual monitoring schedule is active.
- [ ] Rate limiting and auth/session protections reviewed.
- [ ] Production domains use HTTPS.
- [ ] Rollback deployment is identified before cutover.

## Legal, Privacy And Evidence Gates

- [ ] Terms of Service approved.
- [ ] Privacy Policy approved.
- [ ] Refund/cancellation policy approved.
- [ ] Vendor agreement approved.
- [ ] Captain agreement approved.
- [ ] Customer support wording approved.
- [ ] QA evidence is stored outside Git with sensitive values masked.
- [ ] No screenshots committed with phone numbers, OTPs, card details, addresses,
  provider dashboard secrets or private APK links.

## Go/No-Go Decision

| Decision Item | Status |
| --- | --- |
| Internal controlled go-live | `Go / Conditional / No-Go` |
| Live payment activation | `Go / Conditional / No-Go` |
| Public production launch | `Go / Conditional / No-Go` |
| Payment provider selected | `Paystack / Monnify / Squad / Mock only / TBD` |
| Remaining blockers |  |
| Decision owner |  |
| Decision date |  |

## Current Recommended Status

```text
Controlled go-live preparation: In progress
Live payment activation: No-Go until sandbox verification, finance approval,
live-mode engineering review and production secret setup are complete
Mock payment fallback: Required
Public production launch: Not approved by this document
```
