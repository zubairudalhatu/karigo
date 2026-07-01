# Push Template Catalogue

Push payloads must remain short and contain no sensitive order, payment, OTP, or support
details. The app should fetch details from authenticated API endpoints after opening.

| Template | Trigger | Recipient | Title | Body | Data payload | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `payment_successful_push` | Payment successful | Customer | Payment successful | Payment received. Your KariGO order is now being processed. | type, order ID | Draft | Operational |
| `vendor_accepted_order_push` | Vendor accepts | Customer | Order accepted | The vendor has accepted your KariGO order. | type, order ID | Draft | Operational |
| `order_preparing_push` | Preparing | Customer | Order preparing | Your KariGO order is being prepared. | type, order ID | Draft | Add before sandbox |
| `order_ready_for_pickup_push` | Ready for pickup | Customer | Order ready for pickup | Your order is ready and waiting for rider pickup. | type, order ID | Draft | Operational |
| `rider_assigned_push` | Rider assigned | Customer | Rider assigned | A KariGO rider has been assigned. | type, order ID | Draft | No private rider details |
| `rider_new_job_push` | Job assigned/reassigned | Rider | New delivery job | Open the KariGO rider app to review your assigned job. | type, order ID | Draft | High priority |
| `order_on_the_way_push` | On the way | Customer | Order on the way | Your KariGO order is on the way. | type, order ID | Draft | Operational |
| `order_delivered_push` | Delivered | Customer | Order delivered | Confirm receipt before sharing your delivery OTP. | type, order ID | Draft | OTP itself is never included |
| `order_completed_push` | Completed | Customer | Order completed | Your KariGO order has been completed. | type, order ID | Draft | Operational |
| `refund_approved_push` | Refund approved | Customer | Refund approved | Your KariGO refund request has been approved. | type, payment/order ID | Draft | No amount in payload |
| `support_ticket_updated_push` | Ticket updated | User | Support ticket updated | Your KariGO support ticket has an update. | type, ticket ID | Draft | No message body |
| `rider_earning_paid_push` | Earning marked paid | Rider | Earning marked paid | A KariGO rider earning has been marked paid. | type, earning ID | Draft | No bank details |
| `promo_available_push` | Future approved campaign | Customer | KariGO offer available | Open KariGO to view the offer. | type, promo ID | Future | Requires preferences/frequency controls |
