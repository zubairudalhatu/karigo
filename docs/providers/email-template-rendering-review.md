# Email Template Rendering Review

## Shared Rendering Controls

Every template uses the same renderer and therefore has:

- A fixed subject and KariGO heading
- Escaped HTML variables
- Simple branded HTML and plaintext fallback
- Required `recipientName` and `message` variables
- Optional `actionUrl` and `supportContact`
- Neutral `KariGO Support` contact fallback
- Controlled failure for missing required variables
- No embedded credentials, tracking pixels, or hardcoded personal data

Automated coverage renders every catalogue entry and rejects unresolved template tokens.

## Catalogue Status

| Audience | Template | Rendering | Event integration |
| --- | --- | --- | --- |
| Customer | `welcome-customer` | Ready for mock/sandbox review | Test harness/manual trigger required |
| Customer | `order-created` | Ready | EMAIL channel mapping exists |
| Customer | `payment-successful` | Ready | EMAIL channel mapping exists |
| Customer | `order-status-update` | Ready | EMAIL channel mapping exists |
| Customer | `order-completed` | Ready | EMAIL channel mapping exists |
| Customer | `refund-requested` | Ready | EMAIL channel mapping exists |
| Customer | `refund-approved` | Ready | EMAIL channel mapping exists |
| Customer | `support-ticket-created` | Ready | EMAIL channel mapping exists |
| Customer | `support-ticket-updated` | Ready | EMAIL channel mapping exists |
| Vendor | `vendor-onboarding-received` | Ready | Future trigger |
| Vendor | `vendor-new-order` | Ready | Template exists; dedicated event mapping pending |
| Vendor | `settlement-paid` | Ready | EMAIL channel mapping exists |
| Rider | `rider-onboarding-received` | Ready | Future trigger |
| Rider | `rider-earning-paid` | Ready | EMAIL channel mapping exists |
| Admin | `admin-critical-alert` | Ready | `SYSTEM_ALERT` mapping exists |
| Admin | `admin-payment-refund-alert` | Ready | Future dedicated mapping |
| Admin | `admin-daily-operations-summary` | Rendering-ready placeholder | Scheduler/data composition not implemented |

The additional OTP and account-approval templates remain future-ready but are outside the
Task 34 operational activation set.

## Remaining Review Gates

- Legal/support approval of final wording and contact details
- Approved frontend URLs before action links are enabled
- Per-template event payload review to ensure only required references are included
- Physical inbox/client rendering checks after provider selection
- Event-level email deduplication, queue/retry, bounce, suppression, and complaint handling
