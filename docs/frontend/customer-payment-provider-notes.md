# Customer Payment Provider Notes

## Mock Payment

The customer app currently initiates payment, immediately calls the KariGO verification
endpoint, and navigates to order tracking. This remains the default behavior while
`PAYMENT_PROVIDER=mock`.

## Paystack Sandbox

Paystack initiation returns an `authorizationUrl`, `accessCode`, and transaction
reference. The shared customer payment API type already accepts authorization details,
but checkout currently assumes mock payment and verifies immediately.

## Frontend TODO

Before enabling `PAYMENT_PROVIDER=paystack` for customer testing:

1. Decide between an external secure browser flow and an in-app webview.
2. Open only the backend-returned Paystack authorization URL.
3. Handle the configured callback/deep link without treating the redirect as success.
4. Call `GET /api/v1/payments/verify/:transactionReference`.
5. Show success only after KariGO confirms the payment.
6. Handle cancellation, abandoned checkout, timeout, and retry safely.

The frontend must never receive the Paystack secret key, trust query-string payment
status, calculate the authoritative amount, or mark the order paid.

Mock payment remains suitable for the internal demo until this checkout decision and
sandbox device/browser walkthrough are complete.
