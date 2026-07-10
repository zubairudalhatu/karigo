# Bills & Utilities API

All paths are under `/api/v1`.

## Catalogue

`GET /utilities/providers?type=AIRTIME`

Returns active demo utility providers. `type` is optional and supports `AIRTIME`, `DATA`, `ELECTRICITY` and `CABLE_TV`.

`GET /utilities/products?providerId=...`

Returns active demo utility products. `providerId` and `type` are optional filters.

## Customer Endpoints

All customer endpoints require `Authorization: Bearer <access_token>` for a customer user.

`POST /customer/utilities/quote`

Creates a server-side mock quote. Example:

```json
{
  "serviceType": "AIRTIME",
  "providerId": "provider-id",
  "amountKobo": 50000,
  "recipient": "08030000000"
}
```

`POST /customer/utilities/transactions`

Creates and executes a mock utility transaction. No live provider fulfilment occurs.

`GET /customer/utilities/transactions`

Lists the authenticated customer's utility test transactions.

`GET /customer/utilities/transactions/:transactionId`

Returns the authenticated customer's utility receipt.

`POST /customer/utilities/transactions/:transactionId/cancel`

Cancels an eligible non-terminal utility transaction.

## Admin Endpoints

All admin endpoints require an admin token.

`GET /admin/utilities/summary`

Returns total, pending, successful, failed and total test value metrics.

`GET /admin/utilities/transactions`

Supports optional filters:

- `serviceType`
- `status`
- `providerId`
- `customerId`
- `search`
- `dateFrom`
- `dateTo`

Broad list responses mask recipient values.

`GET /admin/utilities/transactions/:transactionId`

Returns detail for admin monitoring. Recipient values remain masked.

`PATCH /admin/utilities/transactions/:transactionId/status`

Allows staging-safe manual status override outside production. This never triggers real fulfilment.

## Security Notes

- Utility transactions are separate from delivery orders and food/grocery checkout.
- Mock provider has no external HTTP calls.
- Provider metadata and secrets are not exposed.
- Vendor, rider and public users cannot access customer utility transactions.
- Customer can only access their own utility transaction records.
