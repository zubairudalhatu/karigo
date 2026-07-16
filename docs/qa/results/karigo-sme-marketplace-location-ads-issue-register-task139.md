# Task 139 SME Marketplace, Location, Ads and Fresh Customer APK Issue Register

Use this register for issues found while verifying Task 138 after deployment and
fresh Customer APK installation.

Do not record passwords, OTP values, delivery codes, bearer tokens, refresh
tokens, private APK links, full phone numbers, private addresses, provider phone
numbers, provider emails, payment keys, card details, ad contact private details
or unmasked screenshots in this file.

## Severity Guide

| Severity | Meaning |
| --- | --- |
| P0 | Blocks pilot use, exposes sensitive data or enables an explicitly disabled live feature. |
| P1 | Blocks a critical Task 138 flow such as SME request submission, location permission, payment selector, Admin Ads or Vendor Ads. |
| P2 | Important usability or reporting issue with a workaround. |
| P3 | Minor copy, spacing or non-blocking polish item. |

## Issue Register

| Issue ID | Severity | Area | Description | Evidence reference | Owner | Status | Follow-up task | Blocks closeout |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `T139-ISS-001` |  |  |  |  |  | `Open / Resolved / Deferred / N/A` |  | `Yes / No` |
| `T139-ISS-002` |  |  |  |  |  |  |  |  |
| `T139-ISS-003` |  |  |  |  |  |  |  |  |

## Known Non-Issues / Expected Guardrails

| Observation | Expected explanation |
| --- | --- |
| Customer EAS Update alone does not show location feature | Expected because Task 138 added `expo-location`, a native dependency requiring fresh APK. |
| Ads do not charge vendor wallet or payment card | Expected; controlled ad credits are internal pilot balances only. |
| Health professional SME category cannot be booked | Expected; health/doctor category remains readiness-only pending future approval. |
| Paystack/Monnify/Squad are visible as test/sandbox options | Expected only for sandbox verification; live payment remains disabled. |
| Active ad may not appear if no campaign is approved/active | Expected until Admin approves and activates a campaign. |

## Escalation Rules

Pause Task 139 closeout and create a fix task if any of the following occur:

- Provider private phone/email appears in the Customer App.
- Customer can access another customer's SME request or review.
- Location permission denial blocks manual address entry.
- Payment selector activates live payment mode or hides mock payment.
- Admin/Vendor Ads page exposes real wallet top-up, card payment, payout or
  automatic billing.
- Ads alter checkout quote, payment total, delivery fee or order amount.
- Fresh APK does not use staging API or staging package identity.
- Prisma migration is not applied or backend deployment fails.
