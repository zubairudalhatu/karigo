# Task 152 - Captain App UI, Session and Signup Verification

Date: 2026-07-17

## Purpose

Provide the QA checklist for the KariGO Captain App release-candidate improvements added in Task 152.

## Pre-Test Conditions

- Backend API is reachable.
- Live payments remain disabled.
- Live rides remain disabled/readiness-only.
- Delivery Captain test account exists.
- Delivery Captain application endpoint is available.
- Captain App build/update includes Task 152 changes.

## UI Verification

| Area | Expected result | Status |
| --- | --- | --- |
| Bottom navigation | Home, Deliveries, Earnings and Profile show icons and labels | Pending |
| Active tab | Active tab uses KariGO red | Pending |
| Inactive tabs | Inactive tabs use neutral grey | Pending |
| Homepage logo | KariGO logo appears cleanly in the top card | Pending |
| Homepage greeting | Shows `Hi, Captain` or Captain first name | Pending |
| Homepage copy | Shows `Manage your delivery assignments and availability.` | Pending |
| Availability label | Online state displays `Online`, not `Available` | Pending |
| Offline label | Offline state remains `Offline` | Pending |
| Availability actions | Online shows `Go offline`; offline shows `Go online` | Pending |
| Ride Captain | Ride Captain remains readiness-only/gated | Pending |
| Captain tools | Delivery, earnings, profile, support, Ride readiness and logout/support paths are clear | Pending |

## Session Persistence Verification

| Scenario | Expected result | Status |
| --- | --- | --- |
| Login once | Captain signs in successfully | Pending |
| Close app | App can be closed without clearing session | Pending |
| Reopen app | Captain remains signed in and reaches dashboard | Pending |
| Expired access token | App refreshes safely when refresh token is valid | Pending |
| Invalid session | App returns to login without exposing token details | Pending |
| Logout | Stored access and refresh tokens are cleared | Pending |
| Password storage | Password is never stored | Pending |

## Profile Verification

| Scenario | Expected result | Status |
| --- | --- | --- |
| Profile card | Shows photo/avatar, name, phone and email when available | Pending |
| Verification status | Shows active/inactive status | Pending |
| Availability status | Shows online/offline status | Pending |
| Completed deliveries | Shows completed delivery count | Pending |
| Delivery Captain mode | Shows approval status | Pending |
| Ride Captain readiness | Shows readiness-only status | Pending |
| Photo URL preview | Valid HTTPS image URL previews in the app | Pending |
| Save profile | Photo URL and vehicle details persist through profile save | Pending |
| Invalid photo URL | Unsafe/invalid URL is rejected with safe copy | Pending |

## In-App Application Verification

| Scenario | Expected result | Status |
| --- | --- | --- |
| Login screen CTA | `Apply to become a Captain` is visible | Pending |
| Welcome screen CTA | `Apply to become a Captain` is visible | Pending |
| Application route | `/auth/apply` opens without requiring login | Pending |
| Required fields | Full name, phone, guarantor name, guarantor phone and confirmation are required | Pending |
| Vehicle type | Vehicle type can be selected | Pending |
| Ride readiness interest | Can be selected but does not activate rides | Pending |
| Submission | Creates a Delivery Captain application review record | Pending |
| Success message | Shows approved success copy | Pending |
| Login creation | Submission does not create Captain login automatically | Pending |
| Dispatch/payouts | Submission does not activate dispatch or payouts | Pending |

## Regression Checks

- [ ] Captain login still works.
- [ ] Availability toggle still works.
- [ ] Deliveries tab still works.
- [ ] Earnings tab still works.
- [ ] Profile tab still works.
- [ ] Delivery OTP completion flow still works.
- [ ] Ride Captain gated/readiness-only flow still works.
- [ ] API base URL remains unchanged.
- [ ] Staging channel remains unchanged.
- [ ] Production profile remains unchanged.
- [ ] EAS project ID remains unchanged.

## Build Notes

```text
New native dependency added: No
Backend change: No
Admin Portal change: No
Captain EAS Update: Recommended for JS changes
Fresh Captain APK/AAB: Required before using Play closed testing for this updated Captain experience
```

## Current QA Status

```text
Automated typecheck: Passed
Automated regression check: Passed
Expo config validation: Passed
Manual closed-testing verification: Pending
```
