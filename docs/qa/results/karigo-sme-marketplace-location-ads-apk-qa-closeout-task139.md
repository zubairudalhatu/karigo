# Task 139 SME Marketplace, Location, Ads and Fresh Customer APK QA Closeout

Date prepared: 2026-07-16

## Purpose

This document is the post-deployment QA closeout record for the Task 138 SME
Services marketplace, native location detection, managed ads foundation and fresh
Customer APK verification.

This is a QA and release-verification record only. It does not activate live
Paystack, live Monnify, live Squad, Accelerate.ng utilities, wallet withdrawals,
automatic refunds, live rides, ride dispatch, payouts, public provider login
outside the approved vendor workspace, Pharmacy marketplace, marketing SMS,
promotional email, newsletter email or bulk SMS/email.

## Source Changes Under Review

| Task / commit | Scope |
| --- | --- |
| Task 137 | Customer checkout and order-detail retry payment provider selector for mock, Paystack Test Mode, Monnify Sandbox and Squad Sandbox. |
| `57b55b9` | SME Services provider marketplace, preferred provider selection, provider reviews, managed ad placement, Admin Ads, Vendor Ads and controlled ad-credit ledger foundation. |
| `bc3af7a` | Customer App native-backed location detection with `expo-location` and safe permission copy. |

## Deployment Requirements

| Item | Required state | QA confirmation | Evidence reference |
| --- | --- | --- | --- |
| Backend redeployed | Required for SME provider marketplace, reviews and ads APIs | `Pending / Pass / Fail` |  |
| Prisma migration applied | Required: `20260716120000_task138_sme_marketplace_ads_foundation` | `Pending / Pass / Fail` |  |
| Admin Portal redeployed | Required for Admin Ads page | `Pending / Pass / Fail` |  |
| Vendor Dashboard redeployed | Required for Vendor Ads page | `Pending / Pass / Fail` |  |
| Fresh Customer APK built | Required because `expo-location` is a native dependency | `Pending / Pass / Fail` |  |
| Fresh Customer APK installed | Required on approved Android pilot test device | `Pending / Pass / Fail` |  |
| Customer EAS Update only | Not sufficient for Task 138 location feature | Confirmed | Native dependency requires fresh APK |
| Captain APK | Not required | Confirmed | No Captain App change in Task 138 |

## Pilot Configuration Guardrails

| Area | Required pilot state | QA result |
| --- | --- | --- |
| Payment mode | Mock payment remains default for first Kano pilot | `Pending / Pass / Fail` |
| Paystack/Monnify/Squad | Sandbox foundations only; live mode disabled | `Pending / Pass / Fail` |
| Accelerate.ng utilities | Future integration; not active | `Pending / Pass / Fail` |
| Wallet top-up/withdrawal/refund automation | Disabled | `Pending / Pass / Fail` |
| Payout automation | Disabled | `Pending / Pass / Fail` |
| KariGO Rides | Readiness-only; no live ride dispatch | `Pending / Pass / Fail` |
| Pharmacy marketplace | Disabled unless separately approved | `Pending / Pass / Fail` |
| Marketing/bulk messaging | Disabled | `Pending / Pass / Fail` |

## Fresh Customer APK Identity

Do not paste private EAS build URLs, APK links, APK hashes tied to private
distribution, device identifiers or tester personal details into Git.

| Item | Expected value | QA result | Evidence reference |
| --- | --- | --- | --- |
| App name | `KariGO Customer Staging` | `Pending / Pass / Fail` |  |
| Android package | `com.karigo.customer.staging` | `Pending / Pass / Fail` |  |
| EAS profile | `customer-staging` | `Pending / Pass / Fail` |  |
| API base URL | `https://karigo-8htn.onrender.com/api/v1` | `Pending / Pass / Fail` |  |
| EAS project ID | `467aa2f6-22b1-4a81-a9d6-c38f3ebe191d` | `Pending / Pass / Fail` |  |
| Native dependency | `expo-location` present in APK | `Pending / Pass / Fail` |  |
| Source commit | `bc3af7a` or later | `Pending / Pass / Fail` |  |
| Build evidence | Stored outside Git | `Pending / Pass / Fail` |  |

## Evidence Safety Rules

- Do not commit APK/AAB files, private APK links, screenshots with unmasked
  private data, device identifiers, OTPs, passwords, delivery codes, bearer
  tokens, refresh tokens, provider secrets, payment keys or card details.
- Mask customer phone numbers, email addresses, service addresses, provider
  contact details and order references in evidence.
- Store detailed screenshots, APK records and device logs in an approved secure
  evidence location outside Git.
- Record only safe references in this repository.

## Deployment Verification

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `T139-DEP-001` | Backend health after redeploy | `/api/v1/health` returns healthy response |  | `Pending / Pass / Fail` |  |
| `T139-DEP-002` | Prisma migration status | Task 138 migration is applied and no pending migrations remain |  | `Pending / Pass / Fail` |  |
| `T139-DEP-003` | Admin Portal deployment | `https://admin.karigo.com.ng` loads deployed Admin Portal with Ads page available |  | `Pending / Pass / Fail` |  |
| `T139-DEP-004` | Vendor Dashboard deployment | `https://vendor.karigo.com.ng` loads deployed Vendor Dashboard with Ads page available |  | `Pending / Pass / Fail` |  |
| `T139-DEP-005` | Customer APK install | Fresh APK installs and opens without crash |  | `Pending / Pass / Fail` |  |
| `T139-DEP-006` | Customer APK staging config | APK uses Render staging API and staging package identity |  | `Pending / Pass / Fail` |  |

## Customer App QA Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `T139-CUST-001` | Home Utilities cleanup | Utilities appear in main categories only; duplicate featured Utilities section is absent |  | `Pending / Pass / Fail` |  |
| `T139-CUST-002` | Managed ad fallback | Home ad placement is labelled `Ad` and states ads do not affect pricing |  | `Pending / Pass / Fail` |  |
| `T139-CUST-003` | Managed approved ad | Approved active Admin ad appears in the home placement |  | `Pending / Pass / Fail / N/A` | Requires approved ad campaign |
| `T139-CUST-004` | Payment provider selector | Checkout shows mock, Paystack Test Mode, Monnify Sandbox and Squad Sandbox options |  | `Pending / Pass / Fail` | Live modes remain disabled |
| `T139-CUST-005` | Payment retry selector | Order detail retry payment shows same safe provider selector |  | `Pending / Pass / Fail` |  |
| `T139-CUST-006` | SME category selection | Selecting a category loads available approved providers for that category |  | `Pending / Pass / Fail` |  |
| `T139-CUST-007` | Provider privacy | Provider cards show safe public profile only; no phone/email appears |  | `Pending / Pass / Fail` |  |
| `T139-CUST-008` | Preferred provider selection | Customer can select a provider as preference |  | `Pending / Pass / Fail` | Preference only; Admin still reviews |
| `T139-CUST-009` | Let KariGO match me | Customer can clear provider preference and request manual matching |  | `Pending / Pass / Fail` |  |
| `T139-CUST-010` | Saved address selection | Customer can select an existing saved service address |  | `Pending / Pass / Fail` |  |
| `T139-CUST-011` | New address entry | Customer can enter and save a new service address before submitting request |  | `Pending / Pass / Fail` |  |
| `T139-CUST-012` | Location permission granted | `Use current location` requests permission and captures approximate coordinates |  | `Pending / Pass / Fail` | Do not record coordinates in Git |
| `T139-CUST-013` | Location permission denied | App remains usable and prompts manual address entry |  | `Pending / Pass / Fail` |  |
| `T139-CUST-014` | SME request submit | Request submits with selected category, address and optional preferred provider |  | `Pending / Pass / Fail` |  |
| `T139-CUST-015` | Health professional guardrail | Health professional category remains readiness-only and cannot be booked |  | `Pending / Pass / Fail` |  |
| `T139-CUST-016` | Customer request detail provider display | Detail shows safe preferred/assigned provider identity without private contact details |  | `Pending / Pass / Fail` |  |
| `T139-CUST-017` | Completed service review | Customer can submit one review after an assigned request is completed |  | `Pending / Pass / Fail / N/A` | Requires completed assigned request |
| `T139-CUST-018` | Review duplicate safety | Customer cannot submit duplicate review for same request |  | `Pending / Pass / Fail / N/A` |  |

## Admin Ads QA Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `T139-ADMIN-001` | Admin Ads page loads | Admin can open `Ads` from sidebar |  | `Pending / Pass / Fail` |  |
| `T139-ADMIN-002` | Create external ad | Admin can create external advertiser ad with safe public copy |  | `Pending / Pass / Fail` | No personal/private data |
| `T139-ADMIN-003` | Create vendor ad | Admin can create or review a vendor-sponsored ad |  | `Pending / Pass / Fail / N/A` | Vendor ID required |
| `T139-ADMIN-004` | Status update | Admin can move campaign through review statuses |  | `Pending / Pass / Fail` |  |
| `T139-ADMIN-005` | Active ad display | Active approved ad appears in Customer App home |  | `Pending / Pass / Fail` |  |
| `T139-ADMIN-006` | Controlled vendor credit grant | Admin can grant controlled internal ad credit |  | `Pending / Pass / Fail` | No real payment collection |
| `T139-ADMIN-007` | Credit release | Rejected/cancelled/expired vendor ads release reserved controlled credit |  | `Pending / Pass / Fail / N/A` | Requires reserved credit |
| `T139-ADMIN-008` | No live billing controls | No card charge, wallet top-up, payout or auto-billing control appears |  | `Pending / Pass / Fail` |  |

## Vendor Ads QA Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `T139-VENDOR-001` | Vendor Ads page loads | Vendor can open `Ads` from sidebar |  | `Pending / Pass / Fail` |  |
| `T139-VENDOR-002` | Credit visibility | Vendor sees available, reserved and campaign counts |  | `Pending / Pass / Fail` | Controlled balance only |
| `T139-VENDOR-003` | Submit ad request | Vendor can submit ad request for Admin review |  | `Pending / Pass / Fail` |  |
| `T139-VENDOR-004` | Review status visible | Vendor sees campaign status and Admin notes/rejection reason where applicable |  | `Pending / Pass / Fail` |  |
| `T139-VENDOR-005` | No live ad purchase | Vendor cannot top up wallet, pay card or trigger automatic ad billing |  | `Pending / Pass / Fail` |  |

## Access Control and Privacy Checks

| Test ID | Scenario | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `T139-SEC-001` | Customer provider endpoint | Returns only approved non-readiness-only safe public provider profiles |  | `Pending / Pass / Fail` | No phone/email |
| `T139-SEC-002` | Non-owner request detail | Customer cannot read another customer's SME request |  | `Pending / Pass / Fail` |  |
| `T139-SEC-003` | Provider review ownership | Customer can review only their own completed assigned request |  | `Pending / Pass / Fail` |  |
| `T139-SEC-004` | Vendor Ads endpoint | Vendor sees only its own campaigns and credit account |  | `Pending / Pass / Fail` |  |
| `T139-SEC-005` | Admin Ads endpoint | Admin role required for campaign review and credit grant |  | `Pending / Pass / Fail` |  |
| `T139-SEC-006` | Customer evidence privacy | No provider phone/email, customer address, OTP, token or private ad contact appears in Git evidence |  | `Pending / Pass / Fail` |  |

## Local Technical Validation Already Completed

These results were recorded during Task 138 implementation and Task 139 document
preparation. They do not replace deployed/manual device evidence.

| Check | Result |
| --- | --- |
| Prisma validate with dummy local URL | Pass |
| Prisma generate | Pass |
| Backend typecheck | Pass |
| Backend build | Pass |
| Backend focused SME tests | 28 tests passed |
| Full backend tests | 60 suites / 364 tests passed |
| Customer App typecheck | Pass |
| Customer App regression | Pass |
| Customer Expo staging config validation | Pass; package `com.karigo.customer.staging`, API `https://karigo-8htn.onrender.com/api/v1`, `expo-location` permission present |
| Expo Doctor | 18/18 checks passed |
| Admin Portal typecheck | Pass |
| Admin Portal regression | Pass |
| Admin Portal production build | Pass |
| Vendor Dashboard typecheck | Pass |
| Vendor Dashboard regression | Pass |
| Vendor Dashboard production build | Pass |
| Secret scan on changed files/docs | No real secrets found |
| `git diff --check` | Pass |

## Closeout Decision

Current closeout state: **Pending live deployment and fresh Customer APK evidence**.

Decision options:

- **Closed - Passed:** deployment, migration, fresh APK install and mandatory QA
  scenarios pass with no P0/P1 issue.
- **Closed - Passed with observation:** core flow passes and only non-blocking
  observations remain.
- **Not closed - Fix required:** any marketplace, location, ads, payment selector,
  access-control or privacy check fails.
- **Paused:** deployment, migration, APK build/install or test-device evidence is
  unavailable.

Final decision: `Pending`.

## References

- `docs/qa/task138-sme-marketplace-location-ads-verification.md`
- `docs/qa/results/customer-test-payment-provider-selection-task137.md`
- `docs/qa/results/karigo-sme-marketplace-location-ads-issue-register-task139.md`
- `docs/qa/results/karigo-sme-marketplace-location-ads-signoff-task139.md`
