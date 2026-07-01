# Payment Provider Integration Plan

## Current Implementation Status

| Provider | Status |
| --- | --- |
| Mock | Implemented and used by local demo/smoke tests |
| Paystack | Sandbox adapter implemented; approved test-account end-to-end checkout and refund reconciliation remain TODO |
| Flutterwave | Placeholder |
| Monnify | Placeholder |
| Squad | Placeholder |

## Shared Production Contract

Every provider must implement the existing `PaymentProvider` contract:

1. Initialize from the server-calculated order total.
2. Return a provider authorization URL/reference.
3. Verify the transaction directly with the provider.
4. Parse and cryptographically verify webhooks from the raw request body.
5. Apply successful payments exactly once.
6. Keep refunds admin-controlled and reconcile the final provider state.

The frontend must never establish payment success. A successful redirect is only a cue
for the backend to verify with the provider.

## Paystack

- Credentials: secret key, public key, webhook secret/signing configuration.
- Variables: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`,
  `PAYSTACK_WEBHOOK_SECRET`.
- Initiation: create transaction using amount in the provider's smallest currency unit,
  customer email, KariGO reference, callback URL, and minimal metadata.
- Verification: query Paystack by KariGO/provider reference and compare status, currency,
  and amount with the stored order/payment.
- Webhooks: verify signature before parsing; process only supported charge/refund events.
- Refunds: submit only after authorised admin approval; persist provider refund reference
  and reconcile asynchronously.

## Flutterwave

- Credentials: secret key, public key, webhook secret/hash.
- Variables: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`,
  `FLUTTERWAVE_WEBHOOK_SECRET`.
- Verify transaction status, amount, currency, and reference directly with Flutterwave.
- Reject webhooks without the expected signature/hash.
- Reconcile asynchronous refunds rather than treating submission as completion.

## Monnify

- Credentials: API key, secret key, contract code, webhook secret.
- Variables: `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`,
  `MONNIFY_CONTRACT_CODE`, `MONNIFY_WEBHOOK_SECRET`.
- Exchange credentials securely where required and cache short-lived access tokens.
- Verify reference, amount, currency, payment status, and contract ownership.
- Verify webhook signatures and support replay-safe processing.

## Squad

- Credentials: secret key, public key, webhook secret.
- Variables: `SQUAD_SECRET_KEY`, `SQUAD_PUBLIC_KEY`, `SQUAD_WEBHOOK_SECRET`.
- Apply the same server-side amount, verification, signed-webhook, refund, and
  reconciliation controls.

## Error Handling And Reliability

- Use bounded timeouts and cautious retries only for safe/idempotent provider calls.
- Map provider failures to stable KariGO error codes without exposing raw secrets.
- Record provider response identifiers and sanitized diagnostic metadata.
- Alert on repeated verification failures, signature failures, and payment/order mismatch.
- Never downgrade a successful/refunded payment because of a delayed older event.

## Test Mode To Live Mode

1. Implement one provider in sandbox behind `PAYMENT_PROVIDER`.
2. Add provider contract and sandbox integration tests.
3. Test invalid signatures, duplicate webhooks, amount mismatch, timeouts, and refunds.
4. Rehearse reconciliation and incident response.
5. Store live keys in a secret manager and rotate pre-launch test keys.
6. Enable live mode only after finance and operations sign-off.

## Go-Live Checklist

- [ ] Provider account/KYC approved
- [ ] Live credentials stored outside source control
- [ ] Callback and webhook URLs use HTTPS
- [ ] Raw-body signature verification enabled
- [ ] Server-side amount/currency checks enabled
- [ ] Verification and webhook idempotency tests pass
- [ ] Refund approval and reconciliation tested
- [ ] Alerts and finance reconciliation owner assigned
- [ ] Mock provider disabled in production
