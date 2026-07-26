# Partner Launch Operations Runbook

This runbook prepares KariGO Operations to onboard real partners for production launch.

## Daily Onboarding Rhythm

1. Review new Partner Workspace registrations.
2. Separate records by partner type:
   - Product Seller
   - Service Provider
   - Both
3. Remove duplicate/test records through Trash.
4. Review documents and profile completeness.
5. Approve only launch-ready partners for activation.
6. Confirm partner can sign in and complete workspace setup.
7. Confirm catalogue or services are customer-ready.
8. Record blockers and escalations before partner goes live.

## Admin Screens To Use

- Admin Portal > Vendor Applications
- Admin Portal > Vendors
- Admin Portal > SME Services
- Admin Portal > SME Provider Directory
- Admin Portal > Audit Logs
- Admin Portal > Payments/Wallets where payment or reconciliation questions appear

## Launch Batch Controls

For each partner launch batch, record:

- partner name;
- partner type;
- city;
- primary contact;
- document status;
- activation status;
- catalogue/service readiness;
- payment/reconciliation notes;
- support owner;
- go/no-go decision.

Do not invite a partner to live operations until the batch owner marks them ready.

## Cleanup Flow

Use this order:

1. Mark inactive or close live partner records where appropriate.
2. Move duplicate/test applications to Trash.
3. Restore only if Admin confirms the record should be active.
4. Permanently delete only after backend safety checks allow it.

## Issue Escalation

| Issue | Escalate To |
| --- | --- |
| Missing profile after login | Admin Operations |
| Duplicate/test application | Admin Operations |
| Document or verification issue | Partner Review |
| Product/service content concern | Partner Success |
| Order handling issue | Operations |
| Payment, settlement or wallet issue | Finance Operations |
| Legal, regulated service or safety concern | Leadership/Legal |

## Production Guardrails

- Do not re-enable demo seed data in production.
- Do not manually expose private provider contacts to customers.
- Do not activate payout automation from onboarding.
- Do not approve unsupported city coverage without Operations signoff.
- Do not store secrets or credentials in launch docs.
