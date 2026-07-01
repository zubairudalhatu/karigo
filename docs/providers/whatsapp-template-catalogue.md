# KariGO WhatsApp Operational Template Catalogue

All templates are drafts implemented in
`services/backend-api/src/modules/notifications/whatsapp/templates/whatsapp-template.catalogue.ts`.
They require Meta approval before real use.

| Template | Trigger / recipient | Purpose and example | Required variables | Consent | Status |
| --- | --- | --- | --- | --- | --- |
| `karigo_otp_fallback` | Future OTP fallback / user | Verification code and safety warning | `otp_code` | Explicit operational opt-in | Future |
| `karigo_order_created` | Order created / customer | "Hello Amina, your KariGO order KGO-100 has been created..." | `customer_name`, `order_reference` | Operational opt-in | Needs approval |
| `karigo_payment_successful` | Payment confirmed / customer | "Payment received for KariGO order KGO-100..." | `order_reference` | Operational opt-in | Needs approval |
| `karigo_vendor_accepted` | Vendor accepted / customer | Vendor accepted confirmation | `order_reference` | Operational opt-in | Needs approval |
| `karigo_order_ready` | Ready for pickup / customer | Ready and awaiting rider | `order_reference` | Operational opt-in | Needs approval |
| `karigo_rider_assigned` | Rider assigned / customer | Rider assigned and phone availability reminder | `order_reference` | Operational opt-in | Needs approval |
| `karigo_rider_picked_up` | Rider picked up / customer | Pickup confirmation | `order_reference` | Operational opt-in | Needs approval |
| `karigo_order_on_the_way` | On the way / customer | Delivery update and OTP safety reminder | `order_reference` | Operational opt-in | Needs approval |
| `karigo_rider_arrived` | Rider arrived / customer | Arrival and OTP safety reminder | `order_reference` | Operational opt-in | Needs approval |
| `karigo_order_completed` | Completed / customer | Completion and thank-you | `order_reference` | Operational opt-in | Needs approval |
| `karigo_refund_requested` | Refund requested / customer | Refund review confirmation | `order_reference` | Operational opt-in | Needs approval |
| `karigo_refund_approved` | Refund approved / customer | Refund approval confirmation | `order_reference` | Operational opt-in | Needs approval |
| `karigo_support_updated` | Ticket updated / customer | Support update and app direction | `ticket_reference` | Operational opt-in | Needs approval |
| `karigo_vendor_new_order` | New paid order / vendor | Open dashboard to accept/reject | `order_reference` | Vendor operational opt-in | Needs approval |
| `karigo_settlement_paid` | Settlement marked paid / vendor | Open dashboard for details | None | Vendor operational opt-in | Draft |
| `karigo_rider_new_job` | Job assigned / rider | Open rider app for job details | `order_reference` | Rider operational opt-in | Needs approval |
| `karigo_rider_earning_paid` | Earning marked paid / rider | Open rider app for details | None | Rider operational opt-in | Draft |

## Marketing

No marketing templates are prepared. Future marketing requires explicit marketing
consent, approved templates, preference controls, opt-out handling, frequency limits,
and compliance review.

Unsupported notification types and unrestricted text messages are rejected rather than
falling back to generic content.
