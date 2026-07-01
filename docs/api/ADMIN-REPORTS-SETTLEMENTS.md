# KariGO Admin Reports and Settlement Management

## Access Control

- Operational dashboard and order views: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_OFFICER`, `DISPATCH_OFFICER`.
- Reports: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_OFFICER`, `DISPATCH_OFFICER`.
- Settlement and payout management: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_OFFICER`.
- Support agents continue to use the restricted admin support routes.

## Dashboard and Reports

```http
GET /api/v1/admin/dashboard
GET /api/v1/admin/reports/operations
GET /api/v1/admin/reports/finance
GET /api/v1/admin/reports/vendors
GET /api/v1/admin/reports/riders
```

Operations and finance reports accept optional `dateFrom` and `dateTo` filters. Dashboard and finance totals are calculated from successful payments, completed-order records, vendor settlements, and rider earnings.

Preparation and delivery duration averages currently return `0` because dedicated lifecycle timestamps are not yet persisted. Rider rejection counts per rider also remain a reporting TODO.

## Admin Orders

`GET /api/v1/admin/orders` supports status, payment status, vendor, rider, customer, service category, date range, and order-number filters. Order details include fulfilment summaries, payments, history, support tickets, settlements, and rider earnings while omitting delivery OTPs and private bank details.

## Settlements and Earnings

```http
GET  /api/v1/admin/settlements/vendors
GET  /api/v1/admin/settlements/vendors/:id
POST /api/v1/admin/settlements/vendors/:id/mark-paid
GET  /api/v1/admin/settlements/riders
GET  /api/v1/admin/settlements/riders/:id
POST /api/v1/admin/settlements/riders/:id/mark-paid
```

Mark-paid actions support pending or processing records, store `paidAt`, and create `AdminAuditLog` records. No bank-transfer API is connected; administrators must confirm external payment before using mark-paid.
