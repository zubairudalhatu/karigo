# Task 152 - KariGO Captain App Release-Candidate Polish

Date: 2026-07-17

## Purpose

Record the KariGO Captain App release-candidate improvements for UI polish, session persistence, Captain profile updates and in-app applicant signup.

This task does not activate live rides, live dispatch expansion, live payments, payouts, wallet withdrawals or production publishing.

## Scope

Changed scope:

- `apps/rider-app`
- Captain App release documentation
- Captain App QA documentation

No backend schema or Admin Portal change was required. The existing backend already supports:

- public Delivery Captain applications at `POST /api/v1/delivery-captain-applications`;
- Admin Delivery Captain review;
- Rider profile `photoUrl` update through the authenticated rider profile endpoint.

## Bottom Navigation Changes

- Replaced dot-style tab indicators with icon-style navigation.
- Tabs remain:
  - Home
  - Deliveries
  - Earnings
  - Profile
- Active tab uses KariGO red.
- Inactive tabs use neutral grey.
- Labels remain visible for accessibility and clarity.

## Homepage Improvements

- Updated top hero card with cleaner KariGO logo placement.
- Added stronger greeting:
  - `Hi, Captain`
  - or first name when available.
- Added focused copy:
  - `Manage your delivery assignments and availability.`
- Replaced `Available` status copy with `Online`.
- Kept `Offline` as the opposite state.
- Kept action buttons:
  - `Go offline`
  - `Go online`
- Improved Delivery Captain availability card with status chip and explanatory copy.
- Ride Captain remains readiness-only/gated.

## Profile Improvements

Captain Profile now presents:

- Captain avatar/photo area;
- full name;
- phone number;
- email when available;
- active/inactive verification status;
- online/offline availability status;
- completed delivery count;
- Delivery Captain approval mode;
- Ride Captain readiness status;
- cleaner Captain tools section.

## Profile Photo Support

Implemented safe profile-photo URL support:

- Captains can add or update a secure image URL.
- The app previews valid HTTPS image URLs.
- The value is persisted through the existing rider profile update endpoint.

No device image picker or upload storage was added in this task.

Reason:

- adding device upload would require a native dependency and storage/upload approval;
- release-candidate risk is lower with the existing backend `photoUrl` field;
- true file upload should be a dedicated follow-up task.

Fresh APK/AAB requirement:

```text
New native dependency added: No
Fresh Captain APK/AAB required for Play closed-testing artifact: Yes, because Task 149 AABs were built before this UI/session/signup/logo change.
EAS Update may cover compatible installed builds, but the next Play closed-testing Captain artifact should be rebuilt from this commit.
```

## Session Persistence

Captain session persistence now mirrors the Customer App pattern:

- access token stored in rider-specific secure storage;
- refresh token stored separately in rider-specific secure storage;
- auth client attempts refresh on expired access token;
- app startup restores an existing valid session;
- `/` and `/auth/login` redirect signed-in Captains to the dashboard;
- invalid/expired sessions are cleared safely;
- logout clears stored session and calls backend logout when a refresh token exists.

Passwords are never stored.

## In-App Captain Applicant Signup

Added a public in-app application route:

```text
/auth/apply
```

Entry points:

- Welcome screen;
- Login screen.

The form captures:

- full name;
- phone number;
- email optional;
- city;
- state;
- address optional;
- preferred Kano zone optional;
- vehicle type;
- vehicle plate number optional;
- driver licence number optional;
- profile photo URL optional;
- delivery experience note optional;
- Delivery Captain interest;
- Ride Captain readiness interest;
- guarantor name;
- guarantor phone;
- confirmation checkbox.

Submission behavior:

- uses the existing public Delivery Captain application endpoint;
- creates an application/review record;
- does not automatically approve the applicant;
- does not create a live Captain account;
- does not activate dispatch, payouts, live rides or Ride Captain access.

Success copy:

```text
Your Captain application has been submitted. KariGO will review your details and contact you with the next steps.
```

## Logo Asset

The supplied KariGO PNG logo was added to the Captain App assets by replacing the app-local `assets/karigo-logo.png`.

The app references the committed asset path only. It does not reference local external filesystem paths.

## Backend Changes

```text
Backend code changed: No
Prisma migration required: No
Admin Portal changed: No
```

## Safety Guardrails

- KariGO Rides remains readiness-only.
- Live ride dispatch remains disabled.
- Live payments remain disabled.
- Payouts and wallet withdrawals remain disabled.
- Customer App is not affected.
- Production profiles, staging profiles, EAS project ID and API base URL remain unchanged.

## Current Decision

```text
Captain UI/session/signup polish: Implemented
Backend redeploy: Not required
Admin Portal redeploy: Not required
Captain EAS Update: Recommended for JS changes
Fresh Captain APK/AAB: Required before using Play closed testing for this updated Captain experience
```
