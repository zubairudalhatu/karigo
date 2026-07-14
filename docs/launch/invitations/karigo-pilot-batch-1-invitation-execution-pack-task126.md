# KariGO Pilot Batch 1 Invitation Execution Pack - Task 126

Date prepared: 2026-07-15
Pilot location: Kano
Batch: Batch 1 controlled early access

## Purpose

This pack prepares the first controlled Kano pilot invitation batch for selected
vendors, selected Delivery Captains and first pilot customers.

This is a launch operations and documentation pack only. It does not activate
live Paystack, live Monnify, live Squad, Accelerate.ng utilities, wallet
withdrawals, automatic refunds, live rides, ride dispatch, payouts, Pharmacy
marketplace, provider login, marketing SMS, promotional email, newsletter email
or bulk SMS/email.

## Current Launch Status

| Area | Status |
| --- | --- |
| Customer App APK | Verified OK |
| KariGO Captain APK | Verified OK |
| Payment mode | Mock payment |
| Termii/Resend | Controlled transactional notifications working |
| Paystack/Monnify/Squad | Sandbox foundations only |
| Accelerate.ng | Future utility integration, inactive |
| KariGO Rides | Readiness-only |
| Live rides | Disabled |
| Payout automation | Disabled |
| Wallet withdrawal/refund automation | Disabled |

## Batch 1 Scope

| Group | Target range | Access surface | Batch rule |
| --- | --- | --- | --- |
| Vendors | 3 to 5 | Vendor Dashboard | Invite only vendors approved for Kano pilot readiness |
| Delivery Captains | 3 to 5 | KariGO Captain App | Invite only Delivery Captains cleared for delivery pilot work |
| Customers | 20 to 50 | Customer App | Invite gradually after vendor/captain readiness is confirmed |
| Operations admins | 2 to 3 | Admin Portal | Must be online before customer invites start |

## Invitation Principles

- Batch 1 is controlled early access, not public launch.
- Invite only approved Kano pilot participants.
- Share APK links and dashboard links only through approved private channels.
- Do not publish APK links, credentials or internal pilot instructions publicly.
- Do not send bulk SMS/email, marketing campaigns or newsletter messages.
- Do not record passwords, OTPs, delivery codes, bearer tokens, APK private links,
  full phone numbers or personal contact details in Git-tracked files.
- Use masked evidence references only in this repository.
- Stop invitations immediately if pause rules in
  `karigo-pilot-batch-1-pause-continue-rules-task126.md` are triggered.

## Required Pre-Invite Checks

| Check | Required result | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| Customer App APK | Verified OK and approved for private distribution | Technical lead | `Pending / Pass / Fail` |  |
| KariGO Captain APK | Verified OK and approved for private distribution | Technical lead | `Pending / Pass / Fail` |  |
| Vendor Dashboard | Branded domain loads and vendor login works | Operations lead | `Pending / Pass / Fail` |  |
| Admin Portal | Branded domain loads and admin login works | Operations lead | `Pending / Pass / Fail` |  |
| Backend health | `https://karigo-8htn.onrender.com/api/v1/health` responds | Technical lead | `Pending / Pass / Fail` |  |
| Mock payment | Confirmed as pilot payment mode | Technical lead | `Pending / Pass / Fail` |  |
| Vendor roster | 3 to 5 pilot vendors approved | Commercial/Ops lead | `Pending / Pass / Fail` |  |
| Captain roster | 3 to 5 Delivery Captains approved | Operations lead | `Pending / Pass / Fail` |  |
| Customer list | First customer invite list approved | Pilot lead | `Pending / Pass / Fail` |  |
| Support coverage | Support owner and escalation route active | Support lead | `Pending / Pass / Fail` |  |
| Dispatch coverage | Dispatch owner online during test window | Dispatch lead | `Pending / Pass / Fail` |  |
| Consent/code of conduct | Participants understand pilot rules | Pilot lead | `Pending / Pass / Fail` |  |

## Invitation Sequence

Use staged invitations. Do not invite all customers until vendor, captain and
operations readiness are confirmed.

| Phase | Participants | Trigger to start | Required confirmation before next phase |
| --- | --- | --- | --- |
| 1 | Operations admins | Management approves Batch 1 invite start | Admin Portal login and support/dispatch coverage confirmed |
| 2 | Vendors | Admin coverage confirmed | Vendor Dashboard login, menu/product readiness and availability confirmed |
| 3 | Delivery Captains | Vendor readiness confirmed | Captain APK install, login, availability and test job readiness confirmed |
| 4 | First 5 customers | Vendors and captains ready | First successful browse/login/support readiness check completed |
| 5 | Next 10 to 20 customers | No P0/P1 blockers from first 5 customers | Order flow and support response remain stable |
| 6 | Remaining Batch 1 customers | Pilot lead approves expansion | Metrics remain within continue thresholds |

## Role-Specific Invitation Steps

### Vendors

1. Confirm vendor is approved in the roster.
2. Confirm vendor business is in Kano pilot scope.
3. Send approved private Vendor Dashboard access instructions.
4. Confirm vendor login.
5. Confirm product/menu availability and prices.
6. Confirm vendor support contact through private channel only.
7. Record status in `karigo-pilot-batch-1-invitation-tracker-task126.md`.

### Delivery Captains

1. Confirm Delivery Captain is approved in the roster.
2. Send approved private KariGO Captain APK install instructions.
3. Confirm APK install and login.
4. Confirm Delivery Captain mode is visible.
5. Confirm Ride Captain remains readiness-only.
6. Confirm availability expectations and delivery code rules.
7. Record status in `karigo-pilot-batch-1-invitation-tracker-task126.md`.

### Customers

1. Confirm customer is approved for Batch 1.
2. Send approved private Customer App APK install instructions.
3. Confirm customer understands mock payment pilot mode.
4. Confirm customer understands delivery code safety.
5. Confirm support route and feedback expectation.
6. Invite customers in waves, not all at once.
7. Record status in `karigo-pilot-batch-1-invitation-tracker-task126.md`.

## Approved Invitation Message Rules

- Keep wording short and operational.
- Do not promise public launch availability.
- Do not promise live rides, utilities, wallet withdrawals, refunds or payouts.
- Do not include passwords, OTPs, delivery codes or private APK links in Git.
- Do not send as marketing blast or bulk newsletter.
- Store exact sent messages and recipient details outside Git in the approved
  secure evidence location.

## Batch 1 Operating Window

| Item | Record |
| --- | --- |
| Planned invite date | `[DD Month YYYY]` |
| Planned invite time | `[HH:MM WAT]` |
| Pilot window | `[Start - End]` |
| Pilot lead | `[Name]` |
| Operations lead | `[Name]` |
| Dispatch lead | `[Name]` |
| Support lead | `[Name]` |
| Technical lead | `[Name]` |
| Secure evidence location | `[Reference only, not URL if private]` |

## Launch Decision Before Sending

| Decision item | Required answer |
| --- | --- |
| Vendor invites approved | `Yes / No` |
| Delivery Captain invites approved | `Yes / No` |
| Customer invites approved | `Yes / No` |
| First customer wave size approved | `Yes / No` |
| Pause/continue rules reviewed | `Yes / No` |
| Support instructions reviewed | `Yes / No` |
| Final decision | `Send Batch 1 / Defer / No-Go` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM WAT]` |

## Related Documents

- `karigo-pilot-batch-1-invitation-tracker-task126.md`
- `karigo-pilot-batch-1-support-instructions-task126.md`
- `karigo-pilot-batch-1-pause-continue-rules-task126.md`
- `karigo-pilot-batch-1-invitation-evidence-log-task126.md`
- `../onboarding/karigo-pilot-participant-onboarding-pack-task109.md`
- `../onboarding/karigo-apk-and-link-distribution-tracker-task109.md`
- `../release-candidate/karigo-apk-distribution-instructions-task107.md`
