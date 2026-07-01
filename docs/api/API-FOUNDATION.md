# API Foundation

## Conventions

- Base path: `/api/v1`
- Swagger path: `/api/docs`
- Authentication: Bearer JWT
- Successful response shape: `{ success, message, data }`
- PostgreSQL and API identifiers: UUID
- Monetary values: decimal, currency default `NGN`

## Planned Modules

| Module | First endpoints |
| --- | --- |
| Auth | customer register, OTP verify, login, current user |
| Customers | current profile read/update |
| Addresses | create, list, update, delete, set default |
| Vendors / Products | public browse and vendor-managed catalogue |
| Orders | vendor orders, parcel requests, customer history and tracking |
| Payments | initiate, verify, mock webhook and refund workflow |
| Vendor Orders | accept, reject, preparing and ready-for-pickup |
| Dispatch / Rider Jobs | rider availability, assignment and delivery milestones |
| Support | tickets, messages and admin resolution |
| Admin | dashboard, users, approvals, operations and audit |
| Settlements / Reports | vendor settlement, rider payout and pilot reporting |
| Promotions / Notifications | promo lifecycle and activity feed |

## Access Rules

- Customers may access only their profile, addresses, orders, payments and support records.
- Vendors may access only their vendor profile, catalogue, orders and settlements.
- Riders may access only assigned jobs, their location/availability and earnings.
- Admin access is restricted by `AdminRole`; only `SUPER_ADMIN` has universal access.
- Sensitive admin mutations must create `AdminAuditLog` records.

