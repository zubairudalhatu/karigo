# Customer Payment Provider Notes

## Mock Payment

The customer app currently initiates payment, immediately calls the KariGO verification
endpoint, and navigates to order tracking. This remains the default behavior while
`PAYMENTS_PROVIDER=mock` / `PAYMENT_PROVIDER=mock`.

## Paystack Sandbox

Paystack initiation returns an `authorizationUrl`, `accessCode`, and transaction
reference. Checkout and order detail now open a backend-returned HTTPS authorization URL
for Paystack Test Mode, then require the customer to return to KariGO and tap
`Verify payment`.

## Frontend TODO

Before enabling `PAYMENTS_PROVIDER=paystack` for customer testing:

1. Confirm `PAYSTACK_MODE=test` and `PAYMENTS_LIVE_ENABLED=false`.
2. Open only the backend-returned Paystack authorization URL.
3. If a callback/deep link is configured later, handle it without treating the redirect as success.
4. Call `GET /api/v1/payments/verify/:transactionReference`.
5. Show success only after KariGO confirms the payment.
6. Handle cancellation, abandoned checkout, timeout, and retry safely.

The frontend must never receive the Paystack secret key, trust query-string payment
status, calculate the authoritative amount, or mark the order paid.

Mock payment remains suitable for the internal demo and is the required rollback path.
