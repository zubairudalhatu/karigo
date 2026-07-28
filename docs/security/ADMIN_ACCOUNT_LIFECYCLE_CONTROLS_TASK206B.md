# Admin Account Lifecycle Controls - Task 206B

Task 206B adds audited lifecycle controls for Partner/Vendor, Captain and Customer accounts. These controls are internal operations tools only. They do not activate payments, payouts, rides, public provider login, or any new marketplace scope.

## Scope

Supported admin actions:

- Vendor/Partner accounts: suspend active account, reactivate suspended account, mark pending account operational after onboarding document approval.
- Delivery/Ride Captain accounts: suspend active Captain, reactivate suspended Captain.
- Customer accounts: suspend active Customer, reactivate suspended Customer.
- Vendor applications: reject requires a reason, duplicate review transitions are blocked, approval continues to preserve application/status history.
- Delivery Captain applications: reject requires an applicant-visible or internal reason, duplicate review transitions are blocked, approval remains separated from payouts and rides.

## Guardrails

- Every suspension and reactivation requires a reason of at least 5 characters.
- Admin Portal shows confirmation prompts and impact warnings before lifecycle changes.
- Invalid transitions are rejected by the backend. For example, only active vendors can be suspended and only suspended vendors can be reactivated.
- Suspended Vendor and Captain backing user accounts are set to `SUSPENDED` and active sessions are revoked.
- Suspended Customers keep their order, wallet, utility and support history, but new authenticated service usage is blocked by account status.
- Vendor reactivation keeps `isOpen=false` until the Partner intentionally opens their workspace.
- Captain reactivation keeps availability offline until the Captain chooses to go online.

## Permissions

Backend endpoints remain protected by JWT, role and admin-role guards:

- Vendor lifecycle: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `VENDOR_MANAGER`.
- Captain lifecycle: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `RIDER_MANAGER`.
- Customer lifecycle: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `SUPPORT_AGENT`.

## Audit Records

Sensitive lifecycle actions create Admin audit records with safe metadata:

- actor admin user ID
- target entity type and ID
- action name
- mandatory reason
- previous/new account or operational status
- session revocation flag where applicable

The audit trail is intended for internal review and support dispute resolution. It must not include secrets, OTPs, payment credentials, private provider payloads or card data.

## Operational Checks

After deployment, verify:

1. Super Admin can suspend/reactivate an active Vendor, Captain and Customer using a reason.
2. Vendor/Captain/Customer actions fail when the reason is blank or too short.
3. Duplicate application review transitions are blocked.
4. Rejected Vendor and Delivery Captain applications require a reason.
5. Suspended Vendor/Captain/Customer login/session access is blocked.
6. Admin Audit Logs show the lifecycle action with previous/new status and reason.

## Rollback

If lifecycle controls cause an operational issue:

1. Revert the backend/admin deployment to the previous known-good build.
2. Manually reactivate any incorrectly suspended accounts from the database only after owner approval.
3. Keep the Admin audit record for traceability.
4. Re-run login and dashboard smoke tests for affected accounts.
