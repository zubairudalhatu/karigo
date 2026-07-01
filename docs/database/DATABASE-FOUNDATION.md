# Database Foundation

The initial Prisma schema follows the supplied Database and API Specification and adds explicit relations, indexes and admin sub-roles required for implementation.

## Core Domains

- Identity: `User`, `CustomerProfile`, `Address`
- Commerce: `VendorCategory`, `Vendor`, `Product`
- Delivery: `Rider`, `RiderDocument`, `Order`, `OrderItem`, `OrderStatusHistory`
- Finance: `Payment`, `PaymentWebhookLog`, `VendorSettlement`, `RiderEarning`
- Operations: `SupportTicket`, `SupportTicketMessage`, `Notification`, `AdminAuditLog`
- Retention: `PromoCode`, `PromoCodeUsage`

## Important Guarantees

- Human-readable order, ticket, rider and payment references are unique.
- Product name and price are snapshotted into order items.
- Order status movement is traceable.
- A vendor settlement and rider earning record may occur only once per order/recipient pair.
- Payment webhook payloads are retained for audit and troubleshooting.
- Soft-delete timestamps are available on high-value identity and catalogue records.

No migration is committed yet because the target PostgreSQL environment has not been selected. Run `npm run db:migrate` after configuring `DATABASE_URL`.

