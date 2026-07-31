# Task 207A-R2 - Captain Application Review, Document Review and Activation Coherence

## Scope

Task 207A-R2 fixes the post-submission Captain experience and the Admin lifecycle gap discovered after Task 207A-R1.

- App: KariGO Captain
- Package: `com.karigo.rider`
- Version/runtime: `0.1.1`
- Android versionCode: `10`
- Channel: `captain-production`
- Fresh AAB required: no, JavaScript OTA only

This task does not activate automatic Ride matching, automated Ride payments, payouts, wallet withdrawals, or unrestricted dispatch.

## Root Issue

Submitted and approved applications were being treated too loosely in the Captain app and Admin Portal:

- submitted applicants could reopen the editable application form;
- approved Ride applications could still show under-review copy;
- Admin could approve an application while required secure documents still showed pending;
- existing KariGO Customer accounts with a password hash could show as password pending;
- the Captains page did not clearly separate Delivery and Ride application/profile states.

## Lifecycle Split

Task 207A-R2 keeps three lifecycles separate.

Application review:

- `SUBMITTED`
- `UNDER_REVIEW`
- `CHANGES_REQUESTED`
- `PROVISIONALLY_APPROVED`
- `APPROVED`
- `REJECTED`

Document review:

- `PENDING`
- `APPROVED`
- `CHANGES_REQUESTED`
- `REJECTED`

Operational profile:

- Delivery: `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED` where supported by current Rider status values.
- Ride: `PENDING_ACTIVATION`, `ACTIVE_TEST`, `SUSPENDED`, `DEACTIVATED`.

An approved application does not automatically activate operational access.

## Captain App Changes

The app now has a central status classifier in `apps/rider-app/src/lib/captain-application-status.ts`.

It maps approved, provisionally approved, activation-pending, rejected and revision/requested-change states explicitly instead of treating every non-rejected application as under review.

The editable application route now resolves `GET /api/v1/captain/access` before rendering. If any active or completed application exists, `/auth/apply` redirects to the read-only application status screen.

New route:

- `/application-status`

The screen shows:

- Delivery and Ride application statuses independently;
- application references;
- submitted and last-review dates;
- residential and operating-area summaries;
- document review stage;
- applicant-visible notes only;
- refresh status action.

The Captain dashboard now shows:

- `View application status` for submitted/under-review states;
- `View approval progress` for provisionally approved states;
- `View activation status` for approved but inactive states;
- `Open Ride operations` only when backend `operationalModes` includes `RIDE_CAPTAIN`.

## Backend Changes

Backend projections now compute login readiness safely:

```text
passwordCreated = Boolean(user.passwordHash) || Boolean(user.onboardingPasswordSetAt)
loginReady = account active + phone verified + passwordCreated
```

Password hashes are selected only inside backend services and are never returned, logged or exposed.

New Admin document review endpoints:

```text
PATCH /api/v1/admin/delivery-captain-applications/:applicationId/documents/:documentId/review
PATCH /api/v1/admin/delivery-captain-applications/:applicationId/documents/required/approve
PATCH /api/v1/admin/taxi/driver-applications/:applicationId/documents/:documentId/review
PATCH /api/v1/admin/taxi/driver-applications/:applicationId/documents/required/approve
```

Application approval is blocked when required secure documents are missing, pending, changes-requested, rejected, replaced, deleted or incomplete.

Error code:

```text
REQUIRED_DOCUMENT_REVIEW_INCOMPLETE
```

Existing production records that are already approved with pending documents are not changed automatically. Admin sees an `Approval review incomplete` warning and can review documents explicitly.

Delivery Captain application approval prepares a Delivery profile in `PENDING_APPROVAL` rather than silently activating dispatch access. The audited Captain lifecycle endpoint now supports `ACTIVATE` for eligible pending Delivery Captains only.

Ride profile preparation now verifies required Ride documents before creating/preparing the controlled Ride profile.

## Admin Portal Changes

Delivery Captain Applications and Ride Operations now show:

- required/optional badge;
- document review status;
- short-lived secure file view action;
- Approve;
- Request changes;
- Reject;
- Approve all required documents.

The applicant account panel now uses `LOGIN READY` / `LOGIN SETUP PENDING`.

The Captains page now shows:

- account status and login readiness;
- Delivery application status;
- Delivery profile status;
- Ride application status;
- Ride profile status;
- operational modes;
- links to Delivery and Ride review pages;
- safe `Activate Delivery Captain` action only when the Delivery application is approved.

## Audit Events

The backend records audit events including:

- `CAPTAIN_DOCUMENT_APPROVED`
- `CAPTAIN_DOCUMENT_CHANGES_REQUESTED`
- `CAPTAIN_DOCUMENT_REJECTED`
- `CAPTAIN_REQUIRED_DOCUMENTS_BULK_APPROVED`
- `DELIVERY_CAPTAIN_ACTIVATED`
- `RIDE_CAPTAIN_PROFILE_PREPARED`
- `RIDE_CAPTAIN_ACTIVATED`
- `RIDE_CAPTAIN_SUSPENDED`

## Reconciliation Notes

No automatic data repair is performed.

For controlled accounts with approved applications and pending documents:

1. Open the Admin application.
2. View each required secure document.
3. Approve, request changes or reject each document.
4. Use `Approve all required documents` only after documents have been reviewed.
5. Keep operational activation separate.

## Deployment Order

1. Deploy backend.
2. Apply Prisma migration.
3. Verify Admin document endpoints.
4. Deploy Admin Portal.
5. Review/repair the controlled account through Admin controls.
6. Publish Captain OTA to `captain-production`.
7. Complete real-device acceptance.

Captain OTA command:

```powershell
cd C:\Users\zubai\OneDrive\Documents\KariGO\karigo-platform\apps\rider-app
npx eas-cli@latest update --channel captain-production --environment production --platform android --message "Task 207A-R2 Captain approval and activation coherence" --non-interactive
```

## Acceptance Checklist

- Approved Ride application does not show under-review copy.
- Approved inactive Ride application shows activation pending.
- `Open Ride operations` appears only when Ride profile is `ACTIVE_TEST`.
- Direct `/auth/apply` access redirects to `/application-status` for active/completed applications.
- Admin shows `LOGIN READY` for existing Customer accounts with valid credentials.
- Required documents can be approved/requested/rejected.
- Application approval is blocked until required documents are approved.
- Delivery and Ride modes remain independent.
- No duplicate applications are created.
- No automatic payout, Ride matching or payment automation is activated.

## Rollback

If the OTA needs to be reverted, publish the previous known-good Captain update group for runtime `0.1.1`.

If backend document review creates unexpected Admin workflow issues:

1. Keep operational activation paused.
2. Do not auto-approve documents.
3. Revert backend/Admin commits if required.
4. Redeploy backend/Admin.
5. Re-run `GET /api/v1/captain/access` and Admin application detail smoke checks.
