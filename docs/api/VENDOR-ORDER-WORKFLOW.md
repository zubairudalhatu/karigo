# KariGO Vendor Order Workflow

Vendor dashboard order routes are restricted to authenticated users with the primary `VENDOR` role. Every query is scoped through the authenticated user's vendor profile, so a vendor cannot view or update another vendor's orders. Admin access belongs on separate admin routes.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/vendor-dashboard/orders` | List the authenticated vendor's orders |
| GET | `/api/v1/vendor-dashboard/orders/:orderId` | View an owned order |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/accept` | Accept a paid or confirming order |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/reject` | Reject a paid or confirming order |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/preparing` | Start preparation |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/ready` | Mark ready for pickup |

Listing filters support `status`, `paymentStatus`, `dateFrom`, `dateTo` and order-number `search`.

## Valid Transitions

```text
PAID or VENDOR_CONFIRMING
  -> VENDOR_ACCEPTED
  -> PREPARING
  -> READY_FOR_PICKUP

PAID or VENDOR_CONFIRMING
  -> VENDOR_REJECTED
```

Each transition records an `OrderStatusHistory` entry attributed to the vendor user. Invalid or backward transitions are rejected.

## Rejection and Refund Review

The rejection request requires one of `ITEM_UNAVAILABLE`, `VENDOR_CLOSED`, `PRICE_ERROR`, `TOO_BUSY`, `OUT_OF_DELIVERY_WINDOW` or `OTHER`.

When a successfully paid order is rejected, its successful payment records and order payment status move to `REFUND_PENDING`. The order remains `VENDOR_REJECTED` until an admin reviews and approves the refund through the existing payment refund flow.

## Event Placeholder

Workflow actions currently write lightweight application log events:

- `vendor.order.accepted`
- `vendor.order.rejected`
- `vendor.order.preparing`
- `vendor.order.ready_for_pickup`

No notification delivery infrastructure is implemented in this phase.
