# Rejected Captain Application Trash Policy

## Purpose

This policy covers soft Trash for rejected Delivery Captain and Ride Captain applications. It keeps Admin workspaces clean without deleting KariGO accounts, uploaded documents or operational history.

## Allowed Trash Scope

Only applications with status `REJECTED` may be moved to Trash.

Supported records:

- Delivery Captain applications
- Ride Captain applications

Do not trash:

- submitted applications;
- under-review applications;
- changes-requested applications;
- approved applications;
- applications linked to active operational profiles;
- applications with unresolved operational dependencies.

## Required Trash Metadata

Trash records store:

- `trashedAt`
- `trashedByAdminId`
- `trashReason`
- `restoredAt`
- `restoredByAdminId`

Trash reason is mandatory.

## Admin Behaviour

Active application lists must exclude trashed records. Trash tabs show only trashed records and enough context for Admin review:

- applicant name;
- application reference;
- mode;
- rejected/reviewed date where available;
- trashed date;
- trash reason;
- restore action.

Restore returns the record to rejected application visibility. Restore does not approve or reopen the application.

## Applicant Behaviour

Trashed applications are ignored for active onboarding checks. Applicants should not see trash reason, trash metadata, internal Admin notes or private audit details.

Applicants may see safe copy such as:

Previous application not approved. You may submit a new application when eligible.

## Account Safety

Moving an application to Trash must not:

- delete the KariGO user account;
- delete Customer app access;
- delete uploaded documents;
- delete Ride or Delivery profiles;
- delete order, dispatch or Ride history;
- grant operational access.

## Permanent Delete

Permanent purge is disabled until a retention policy is approved. A future purge flow must require:

- Super Admin permission;
- second confirmation;
- mandatory reason;
- dependency checks;
- private object cleanup plan;
- final audit event.

## Audit Events

Expected events include:

- `DELIVERY_APPLICATION_TRASHED`
- `DELIVERY_APPLICATION_RESTORED`
- `RIDE_APPLICATION_TRASHED`
- `RIDE_APPLICATION_RESTORED`

Audit metadata should include actor, reason, prior status, resulting state and timestamp. Do not include private document URLs or secrets.

## Legacy Linkage

If a rejected legacy application belongs to a verified KariGO account through an unambiguous canonical phone match, it may be linked before status/revision handling. Ambiguous matches require Admin review and must not be auto-linked.

## Revision Interaction

Applications in `CHANGES_REQUESTED` or equivalent revision states should not be moved to Trash unless Admin first rejects them. Delivery document revision must update the existing application and must not create a duplicate application or user.
