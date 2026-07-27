# Task 204 QA Checklist: Unified Accounts and KariGO Rides Upgrade

Date: 2026-07-27

## Scope

This checklist verifies that one KariGO customer account can continue into Partner and Captain onboarding without creating duplicate accounts, and that the Customer App KariGO Rides flow now behaves like a staged booking experience instead of the old pilot-only form.

Do not record passwords, OTPs, payment card data, tokens, screenshots, or private phone numbers in this file.

## Preconditions

- Backend is redeployed with Task 204 changes.
- Customer App, Partner App, and KariGO Captain App receive the Task 204 update or fresh builds as required by release channel behavior.
- Rides remain controlled-pilot/manual-operations only.
- Live ride dispatch, automated matching, ride payments, payouts, and public ride launch remain disabled unless separately approved.

## Unified Account QA

Use one existing active customer account. Record only a masked reference such as `customer account A`.

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Customer can still log into Customer App | Login succeeds; customer flows still load | Pending | |
| Same phone/password logs into Partner App | Login succeeds; app recognises the account | Pending | |
| Partner App does not show generic role rejection | App shows recognised account, continue onboarding, under review, correction required, approved, rejected, or restricted state | Pending | |
| Partner onboarding from existing Customer uses same account | Vendor/Partner application links to the central user; no duplicate user is created | Pending | |
| Re-submitting active Partner application is blocked idempotently | User sees existing application state instead of duplicate application | Pending | |
| Same phone/password logs into KariGO Captain App | Login succeeds; dashboard loads an onboarding/status state | Pending | |
| Captain App shows Delivery Captain state if present | Delivery Captain application/status card appears | Pending | |
| Captain App shows Ride Captain readiness state if present | Ride Captain application/status card appears | Pending | |
| Local phone format and international format resolve to same account | `080...` and `+234...` variants resolve to the same central account | Pending | |

## Partner State QA

| Account State | Expected Partner App Copy/State | Result | Notes |
| --- | --- | --- | --- |
| Active customer, no Partner application | Recognised account; continue Partner onboarding | Pending | |
| Submitted application | Application under review / submitted state | Pending | |
| Changes requested | Correction required with safe note | Pending | |
| Approved Partner profile | Partner dashboard loads | Pending | |
| Rejected application | Clear not-approved state; no dashboard access | Pending | |
| Suspended/closed/restricted account | Restricted/support state | Pending | |

## KariGO Rides Booking QA

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Customer opens KariGO Rides | Rides home screen appears; no old duplicate back controls | Pending | |
| Bottom marketplace navigation is hidden during booking | No Customer bottom nav while inside `/taxi/request` booking flow | Pending | |
| Pickup can use current location | App requests location permission and fills a pickup label when allowed | Pending | |
| Pickup can use saved address | Saved address appears and can populate pickup | Pending | |
| Destination can use saved/recent/manual place | Destination populates without requiring numeric distance fields | Pending | |
| Route preview appears | Pickup/destination summary and estimate prompt appear | Pending | |
| Fare estimate comes from backend | App calls backend fare estimate; no customer-entered distance/duration fields are required | Pending | |
| Ride categories appear | Economy, Comfort, Executive, and XL display when backend returns categories | Pending | |
| Category selection updates estimate | Selected category is sent to backend and shown in estimate | Pending | |
| Payment and schedule options are safe | Cash/manual pilot option is available; wallet/card ride payment remains disabled | Pending | |
| Booking creates a controlled-pilot Ride request | Backend creates request with trip reference and PIN; no automatic dispatch | Pending | |
| Tracking screen appears after booking | Customer sees request status, PIN, and manual Operations assignment note | Pending | |
| Cancel from tracking is safe | Cancel action updates the request or shows a safe failure message | Pending | |

## Admin/Operations Verification

| Check | Expected Result | Result | Notes |
| --- | --- | --- | --- |
| Admin can see new Ride request | Request appears in Rides/Taxi operations area | Pending | |
| Ride request includes selected category | Admin/record metadata includes selected ride category | Pending | |
| Ride request remains manual assignment only | No automatic dispatch or live ride payment is triggered | Pending | |
| Captain visibility remains assignment-based | Captain cannot self-claim unassigned rides | Pending | |

## Regression Guardrails

- Customer App parcel, food/grocery, wallet, utilities, and SME Services should still load.
- Partner App approved profiles should still load dashboard/orders/products/services/profile.
- KariGO Captain Delivery Captain flows should still load assigned delivery jobs.
- Backend auth, vendor applications, phone normalization, and ride fare tests should pass.

## Known Limits

- Route preview is a staged in-app summary, not a live map route engine.
- Ride categories and fare estimates are backend-driven but still controlled-pilot only.
- Ride Captain assignment remains manual through Operations/Admin.
- No live ride payments, live ride dispatch, payouts, or automatic matching were activated.
