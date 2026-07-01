# Push Template Rendering Review

## Safety Rules

Push messages must use short operational text and minimal data: notification type,
entity type, and entity ID. Apps fetch details from authenticated APIs. Never include OTPs,
addresses, phone numbers, payment amounts/details, support message bodies, or private rider
information. Marketing push remains disabled.

## Customer Templates

| Event | Template | Status |
| --- | --- | --- |
| Payment successful | `payment_successful_push` | Ready for mock review |
| Vendor accepted | `vendor_accepted_order_push` | Ready for mock review |
| Ready for pickup | `order_ready_for_pickup_push` | Ready for mock review |
| Rider assigned | `rider_assigned_push` | Ready for mock review |
| On the way | `order_on_the_way_push` | Ready for mock review |
| Order completed | `order_completed_push` | Ready for mock review |
| Refund approved | `refund_approved_push` | Ready for mock review |
| Support updated | `support_ticket_updated_push` | Ready for mock review |

## Rider Templates

| Event | Template | Status |
| --- | --- | --- |
| New assigned job | `rider_new_job_push` | Draft catalogue entry; recipient-specific wiring pending |
| Rider reassigned | `rider_new_job_push` | Reuse proposed; wording/wiring pending |
| Delivery reminder | Not defined | Blocked pending approved trigger/rate controls |
| Earning marked paid | `rider_earning_paid_push` | Ready for mock review |

The runtime push bridge currently sends the event title/message supplied by notification
workflows; it does not render from this catalogue. Provider activation requires one reviewed
mapping layer so the intended customer/rider template and target surface are deterministic.

## Remaining Gates

- Recipient/app-surface-aware template mapping
- Safe payload schema validation
- Duplicate-event key/rate controls
- Physical-device rendering and truncation review
- Legal/product wording approval and notification preference policy
