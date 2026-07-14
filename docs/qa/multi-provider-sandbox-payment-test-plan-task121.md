# Task 121 Multi-Provider Sandbox Payment Test Plan

## Purpose

Verify Paystack, Monnify and Squad sandbox checkout safely before any future management
decision on live payment collection.

This test plan does not approve live payments, automatic refunds, wallet funding,
payout automation or utility fulfilment.

## Evidence Safety

Do not record:

- API keys;
- webhook secrets;
- test card numbers;
- full customer phone numbers;
- private provider dashboard screenshots;
- raw webhook payloads containing private data.

Store sensitive provider evidence outside Git and reference it here only by masked
evidence ID.

## Shared Test Cases

Run these once for each selected provider:

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `PAY121-001` | Confirm backend health | `/api/v1/health` responds before checkout |  | `Pass / Fail / Blocked` |  |
| `PAY121-002` | Create customer order using server quote | Order enters awaiting-payment state with server totals |  | `Pass / Fail / Blocked` |  |
| `PAY121-003` | Initiate payment | Backend returns provider-safe authorization URL/access code only |  | `Pass / Fail / Blocked` |  |
| `PAY121-004` | Confirm no provider secret in API response | No secret key, webhook secret or private token appears |  | `Pass / Fail / Blocked` |  |
| `PAY121-005` | Complete sandbox hosted checkout | Provider accepts sandbox payment |  | `Pass / Fail / Blocked` |  |
| `PAY121-006` | Verify payment server-side | Payment becomes successful and order becomes paid only after backend verify |  | `Pass / Fail / Blocked` |  |
| `PAY121-007` | Duplicate verification | No duplicate order history, promo usage, notification, settlement or earnings |  | `Pass / Fail / Blocked` |  |
| `PAY121-008` | Failed/cancelled payment | Order does not move to paid; user can retry safely |  | `Pass / Fail / Blocked` |  |
| `PAY121-009` | Amount mismatch | Backend rejects provider evidence with wrong amount |  | `Pass / Fail / Blocked` |  |
| `PAY121-010` | Webhook with invalid signature | Request is rejected and payment is not processed |  | `Pass / Fail / Blocked` |  |
| `PAY121-011` | Verified webhook where available | Valid signature is accepted; duplicate webhook remains safe |  | `Pass / Fail / Blocked` |  |
| `PAY121-012` | Roll back to mock | Mock payment works after provider test window |  | `Pass / Fail / Blocked` |  |

## Provider-Specific Notes

### Paystack

- Use Paystack Test Mode only.
- Do not use live keys.
- Verify `PAYSTACK_MODE=test` and `PAYMENTS_LIVE_ENABLED=false`.

### Monnify

- Use Monnify Sandbox/Test Mode only.
- Verify `MONNIFY_MODE=test` or `MONNIFY_MODE=sandbox`.
- Monnify hosted checkout should return a safe checkout URL.
- If sandbox webhook signatures are unavailable, do not process unsigned webhooks as
  paid; use server-side verification.

### Squad

- Use Squad Sandbox/Test Mode only.
- Verify `SQUAD_MODE=test` or `SQUAD_MODE=sandbox`.
- Verify the sandbox secret key is used only server-side.
- Confirm `x-squad-encrypted-body` signature validation before webhook processing.

## Final Decision

| Decision item | Record |
| --- | --- |
| Paystack sandbox ready | `Yes / No / Blocked` |
| Monnify sandbox ready | `Yes / No / Blocked` |
| Squad sandbox ready | `Yes / No / Blocked` |
| Mock remains default for Kano pilot | `Yes / No` |
| No live payment collection enabled | `Yes / No` |
| No secrets committed | `Yes / No` |
| Approved next payment test window | `[Provider / Date / Owner]` |
