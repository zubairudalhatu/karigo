# Task 147 - Mobile Production Release Candidate QA

Date: 2026-07-17

## Purpose

Define QA evidence required before KariGO Customer App and KariGO Captain App are submitted to closed testing, TestFlight or public store review.

This QA pack does not approve live payments or public launch.

## Preconditions

- Production EAS profiles are created in a separate approved engineering task.
- Release candidate build commit is recorded.
- Production API base URL is approved.
- Live payments remain disabled unless a separate payment activation task approves them.
- Store-distributed build is installed through the appropriate testing channel.
- Tester credentials are distributed securely outside Git.

## Customer App Release Candidate QA

| Scenario | Expected Result | Status |
| --- | --- | --- |
| Install from approved testing channel | App installs and opens | Pending |
| Welcome and guest home | User can browse safe surfaces before login | Pending |
| Register/login/OTP | Account access works; OTP not exposed | Pending |
| Vendor browsing | Vendors/products load | Pending |
| Cart | Add/remove/update works | Pending |
| Checkout quote | Delivery fee/discount/payable are server-authoritative | Pending |
| Payment selector | Shows Mock Payment, Monnify Sandbox and Paystack Test Mode only | Pending |
| Squad hidden | Squad Sandbox is not customer-selectable | Pending |
| Mock payment fallback | Mock payment works | Pending |
| Monnify sandbox | Hosted checkout opens when configured | Pending |
| Paystack test mode | Hosted checkout opens when configured | Pending |
| Payment verification | Order is not marked paid until backend verification succeeds | Pending |
| Order tracking | Status/history totals match backend | Pending |
| Delivery code | Visible only at eligible stage to owning customer | Pending |
| Support | Ticket creation/list/detail works | Pending |
| SME Services | Request/provider selection/status tracking works | Pending |
| Wallet | View-only foundation; no top-up/withdrawal | Pending |
| Referrals | Tracking/share only; no automatic reward | Pending |
| Location permission | Requested only when user chooses detection | Pending |
| Profile photo | Upload works if supported by release build | Pending |
| Logout/session expiry | Safe redirect and no token exposure | Pending |

## KariGO Captain Release Candidate QA

| Scenario | Expected Result | Status |
| --- | --- | --- |
| Install from approved testing channel | App installs and opens | Pending |
| Login/session | Delivery Captain can log in and logout | Pending |
| Dashboard | Shows assigned delivery state clearly | Pending |
| Availability | Available/unavailable state works if enabled | Pending |
| Assigned jobs | Jobs list loads | Pending |
| Job detail | Order reference, pickup/delivery information display safely | Pending |
| Accept/reject | Workflow remains consistent with backend | Pending |
| Pickup flow | Arriving/picked-up/on-the-way statuses sync | Pending |
| Destination arrival | Status syncs to customer/admin | Pending |
| Delivery code completion | Valid code completes delivery; invalid code rejected | Pending |
| Earnings | Visibility works without activating payout/withdrawal | Pending |
| Ride mode | Ride Captain/Rides remain readiness-only | Pending |
| Notifications | In-app status remains source of truth | Pending |
| Logout/session expiry | Safe redirect and no token exposure | Pending |

## Cross-Surface QA

- [ ] Customer order appears in Vendor Dashboard.
- [ ] Vendor order action appears in Admin Portal.
- [ ] Admin dispatch assigns Delivery Captain.
- [ ] Captain delivery progress updates Customer App.
- [ ] Completed delivery updates Admin and Vendor records.
- [ ] Settlement visibility remains accurate.
- [ ] No delivery OTP appears in Vendor/Admin/Captain logs or screens.
- [ ] Payment state is consistent across Customer/Admin/Vendor.
- [ ] Mock fallback remains available.

## Store Build Evidence Template

| Field | Value |
| --- | --- |
| App | Customer / Captain |
| Platform | Android / iOS |
| Build profile |  |
| Build ID |  |
| Commit hash |  |
| Runtime version |  |
| Channel |  |
| API base URL |  |
| Tester |  |
| Device/OS |  |
| Result | Passed / Failed / Blocked |
| Issues found |  |
| Reviewer approval |  |

## Release Candidate Decision

```text
Customer App production RC: Pending
Captain App production RC: Pending
Store submission: Not approved by this QA document
Live payments: Not approved by this QA document
```
