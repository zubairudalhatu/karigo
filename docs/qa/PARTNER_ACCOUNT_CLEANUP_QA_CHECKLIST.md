# Partner Account Cleanup QA Checklist

Use this checklist after deploying Task 195.

## Partner Workspace Missing Profile

| Check | Expected Result | Status |
| --- | --- | --- |
| Sign in with an account whose vendor profile is closed/trashed | Dashboard shows `Your partner profile is not active.` | Pending |
| Start Partner Onboarding | Opens Partner Workspace registration route `/register`. | Pending |
| Log out | Clears session and returns to login. | Pending |
| Contact Support | Opens KariGO public contact page. | Pending |
| Active partner login | Existing active vendor/partner account still loads dashboard, orders, profile and onboarding pages. | Pending |

## Vendor Applications Trash

| Check | Expected Result | Status |
| --- | --- | --- |
| Open Admin > Vendor Applications | Active filter loads by default. | Pending |
| Active filter | Trashed applications are excluded. | Pending |
| All filter | Active and trashed applications are visible. | Pending |
| Move duplicate/test application to Trash | Application disappears from Active and appears under Trashed. | Pending |
| Trash reason/note | Reason and note display on the application card. | Pending |
| Restore from Trash | Application returns to Active list. | Pending |
| Review trashed application | Backend blocks review until restored. | Pending |

## Vendor Applications Permanent Delete

| Check | Expected Result | Status |
| --- | --- | --- |
| Delete without typing `DELETE` | UI cancels the action. | Pending |
| Safe trashed duplicate/test application | Backend permanently deletes application-owned child records and application. | Pending |
| Application not in Trash | Backend blocks permanent delete. | Pending |
| Application linked to active partner profile | Backend blocks permanent delete. | Pending |
| Application linked to orders/payments/settlements/payout account/order items | Backend blocks permanent delete with safe message. | Pending |
| Admin audit log | Trash, restore and permanent delete actions are recorded. | Pending |

## Partner Account Trash

| Check | Expected Result | Status |
| --- | --- | --- |
| Move Partner Account to Trash / Close | Safe duplicate/test account is hidden from active Vendors and public discovery. | Pending |
| Restore Partner Account | Account returns from Trash. | Pending |
| Permanent delete without typing `DELETE` | UI cancels the action. | Pending |
| Permanent delete safe trashed account | Backend deletes only when no protected operational records exist. | Pending |
| Unsafe partner account delete | Backend blocks delete and says to keep record in Trash. | Pending |

## Regression Guardrails

- Existing approved applications remain visible in Active or All when not trashed.
- Vendor application approval still creates/links vendor account and activation link.
- Admin role guard still protects all cleanup endpoints.
- Non-admin and vendor users cannot call admin cleanup endpoints.
- No customer/vendor self-delete endpoint is introduced.
- No financial, wallet, payment, order, payout or settlement records are deleted by application cleanup.
