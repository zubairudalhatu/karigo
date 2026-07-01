# KariGO Transactional Email Template Catalogue

All templates are implemented in
`services/backend-api/src/modules/notifications/email/templates/template.catalogue.ts`.
Every template currently requires `recipientName` and `message`; `actionUrl` is optional
for templates with a call to action.

| Template | Trigger / recipient | Subject | Status |
| --- | --- | --- | --- |
| `welcome-customer` | Customer account created | Welcome to KariGO | Ready for mock |
| `otp-verification` | Future SMS fallback / customer | Your KariGO verification code | Future-ready |
| `order-created` | Customer order created | Your KariGO order has been created | Ready for mock |
| `payment-successful` | Customer payment confirmed | Payment successful for your KariGO order | Ready for mock |
| `order-status-update` | Customer delivery status changed | Your KariGO order status has been updated | Ready for mock |
| `order-completed` | Customer order completed | Your KariGO order has been completed | Ready for mock |
| `refund-requested` | Customer refund requested | Refund request received | Ready for mock |
| `refund-approved` | Customer refund approved | Refund approved | Ready for mock |
| `support-ticket-created` | Customer support ticket created | KariGO support ticket created | Ready for mock |
| `support-ticket-updated` | Customer/admin ticket update | KariGO support ticket updated | Ready for mock |
| `vendor-onboarding-received` | Vendor onboarding received | KariGO vendor onboarding received | Future-ready |
| `vendor-account-approved` | Vendor approved | Your KariGO vendor account is approved | Future-ready |
| `vendor-new-order` | Vendor receives paid order | New KariGO order received | Ready for mock |
| `settlement-paid` | Vendor settlement paid | KariGO settlement marked paid | Ready for mock |
| `rider-onboarding-received` | Rider onboarding received | KariGO rider onboarding received | Future-ready |
| `rider-account-approved` | Rider approved | Your KariGO rider account is approved | Future-ready |
| `rider-earning-paid` | Rider earning paid | KariGO rider earning marked paid | Ready for mock |
| `admin-critical-alert` | Critical operational/support alert | Critical KariGO operations alert | Future-ready |
| `admin-payment-refund-alert` | Payment/refund review | KariGO payment or refund alert | Future-ready |
| `admin-daily-operations-summary` | Scheduled admin summary | KariGO daily operations summary | Placeholder |

## Future Improvements

- Version and localize templates.
- Add approved web/app deep links.
- Add provider-side message IDs and delivery telemetry.
- Add legally reviewed footer links and company contact details.
- Add queueing, retry, suppression, bounce, and complaint handling.
