# Partner Account Trash And Delete Runbook

Use this runbook when KariGO Admin needs to clean duplicate, test, created-in-error or inactive partner/vendor records.

## Trash, Close, Archive And Permanent Delete

| State | Meaning | Typical Use |
| --- | --- | --- |
| Trash | Soft-hidden record. It is removed from default active Admin lists and public/partner operational surfaces but retained for audit. | Duplicate/test partner applications, safe inactive partner accounts. |
| Close | Vendor/Partner Account is no longer operational and should not appear as open to customers. | Real partner leaving the platform, temporary business closure. |
| Archive | Catalogue/service item is hidden while historical references remain intact. | Old products/services tied to an account. |
| Permanent Delete | Hard removal of a safe trashed record and its record-owned child data only. | Duplicate/test application with no operational or financial history. |

## Vendor/Partner Applications

Admin can manage applications from **Admin Portal > Vendor Applications**.

Available filters:

- Active
- Trashed
- All

Available actions:

- Move to Trash
- Restore from Trash
- Permanently Delete

Trash requires a reason:

- duplicate
- test account
- created in error
- rejected onboarding
- inactive/closed
- other

Permanent delete requires typing `DELETE` or `PERMANENTLY DELETE`.

Permanent delete is blocked when the application:

- is not already in Trash;
- is linked to an active partner/vendor profile;
- has linked vendor orders;
- has settlement records;
- has payout account records;
- has product order-item history;
- has linked payment records;
- is otherwise needed for operational or legal audit review.

If blocked, keep the record in Trash.

## Vendor/Partner Accounts

Admin can manage partner accounts from **Admin Portal > Vendors**.

Available actions:

- Move Partner Account to Trash / Close
- Restore Partner Account
- Permanently Delete Partner Account

Permanent delete is only allowed for trashed test accounts with no protected operational records. The backend blocks deletion when the partner account has:

- orders;
- settlements;
- payout account records;
- promo codes;
- products tied to order items;
- other retained operational history.

If deletion is unsafe, leave the account closed/trashed and use notes/audit logs for context.

## Missing Partner Profile In Partner Workspace

If a signed-in Partner Workspace account no longer has an active vendor/partner profile, the workspace shows:

```text
Your partner profile is not active.
```

The account can:

- Start Partner Onboarding;
- Log out;
- Contact Support.

The Partner Workspace must not recreate, restore or reactivate closed partner records. Only Admin can restore or approve accounts.

## Duplicate/Test Application Cleanup

For records such as duplicate restaurant test applications:

1. Open **Admin Portal > Vendor Applications**.
2. Keep filter on **Active**.
3. Find the duplicate/test application.
4. Select the correct trash reason.
5. Add a short note, for example `Duplicate live-test application`.
6. Click **Move to Trash**.
7. Switch filter to **Trashed** and verify the record moved.
8. If it has no linked operational/financial history, type `DELETE` and permanently delete.
9. If deletion is blocked, leave it in Trash.

## Safety Rules

- Do not delete real users, real orders, real payments, wallet ledgers, settlements or payout records.
- Do not use partner self-service screens to restore accounts.
- Do not expose document URLs, credentials, tokens or private notes outside Admin surfaces.
- Use Trash first, then permanent delete only after backend safety checks pass.
