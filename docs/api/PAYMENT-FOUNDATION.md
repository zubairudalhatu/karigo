# KariGO Payment Foundation

The payment foundation uses a provider abstraction selected by `PAYMENT_PROVIDER`. Only the `mock` provider performs a complete flow in this phase. Paystack, Flutterwave, Monnify and Squad providers are explicit placeholders and make no external API calls.

## Required Environment

```env
PAYMENT_PROVIDER=mock
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
SQUAD_SECRET_KEY=
```

## Initiation Flow

1. An authenticated customer creates an order.
2. The customer calls `POST /api/v1/payments/initiate` with the order ID and displayed amount.
3. The API confirms order ownership and compares the amount with the server-owned order total.
4. A pending `Payment` record and transaction reference are created.
5. The active provider returns an authorization response.

Mock authorization URLs use `mock://payment/{transactionReference}`.

## Mock Verification Flow

Call `GET /api/v1/payments/verify/{transactionReference}` as the owning customer.

Successful verification transactionally:

- Marks the payment `SUCCESSFUL`.
- Marks the order payment status `SUCCESSFUL`.
- Moves an `AWAITING_PAYMENT` order to `PAID`.
- Creates one order-status history entry.

Repeated verification returns the already-processed payment without duplicating order processing.

## Webhook Simulation

Send:

```http
POST /api/v1/payments/webhook/mock
Content-Type: application/json
```

```json
{
  "eventType": "payment.success",
  "transactionReference": "KGO-MOCK-...",
  "status": "successful"
}
```

Webhook payloads are retained in `PaymentWebhookLog`. A unique gateway/event/reference constraint prevents duplicate webhook processing.

## Refund Flow

Customer request:

```http
POST /api/v1/payments/{paymentId}/refund-request
```

This requires an owned successful payment and moves payment/order states to `REFUND_PENDING` and `REFUND_REQUESTED`.

Admin approval:

```http
POST /api/v1/admin/payments/{paymentId}/approve-refund
```

This requires an authenticated `ADMIN` and moves payment/order states to `REFUNDED`. No real gateway refund API is called in this phase.

