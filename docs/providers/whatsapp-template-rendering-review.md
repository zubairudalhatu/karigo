# WhatsApp Operational Template Rendering Review

All real sends require Meta-approved templates and auditable operational opt-in. Current
statuses are repository readiness labels, not provider approval.

| Template | Recipient | Trigger | Required variables | Status |
| --- | --- | --- | --- | --- |
| `karigo_order_created` | Customer | Order created | customer name, order reference | Needs Approval |
| `karigo_payment_successful` | Customer | Confirmed payment | order reference | Needs Approval |
| `karigo_vendor_accepted` | Customer | Vendor accepted | order reference | Needs Approval |
| `karigo_order_ready` | Customer | Ready for pickup | order reference | Needs Approval |
| `karigo_rider_assigned` | Customer | Rider assigned | order reference | Needs Approval |
| `karigo_order_on_the_way` | Customer | On the way | order reference | Needs Approval |
| `karigo_order_completed` | Customer | Completed | order reference | Needs Approval |
| `karigo_refund_requested` | Customer | Refund requested | order reference | Needs Approval |
| `karigo_refund_approved` | Customer | Refund approved | order reference | Needs Approval |
| `karigo_support_updated` | Customer | Customer-visible support status | ticket reference | Needs Approval |
| `karigo_vendor_new_order` | Vendor | New confirmed paid order | order reference | Needs Approval |
| `karigo_settlement_paid` | Vendor | Settlement marked paid | none | Draft |
| `karigo_rider_new_job` | Rider | Job assigned/reassigned | order reference | Needs Approval |
| `karigo_rider_earning_paid` | Rider | Earning marked paid | none | Draft |

Additional pickup/arrival templates exist in the catalogue and remain operational drafts.
OTP fallback is future-only and excluded from Task 36 activation.

## Rendering And Content Controls

- Required variables are validated before provider invocation.
- Automated tests render every catalogue entry without unresolved placeholders.
- Unsupported notification types, including promotions, are rejected.
- Unrestricted text-message sending is disabled in mock and Meta placeholder modes.
- Messages contain no payment credentials, amounts, phone details, internal support notes,
  bank details, or guaranteed refund timing.
- The customer app, rider app, and vendor dashboard remain the operational action points.

## Remaining Gates

- Meta template-name/language/version approval
- Consent/opt-out and suppression records
- Provider-specific variable ordering and length validation
- Per-event idempotency and frequency limits
- Legal/Privacy wording review and controlled test-recipient approval
