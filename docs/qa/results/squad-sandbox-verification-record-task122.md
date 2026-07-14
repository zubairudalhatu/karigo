# Task 122 Squad Sandbox Verification Record

## Purpose

Record controlled Squad Sandbox/Test Mode checkout verification for KariGO staging
without activating live Squad.

## Guardrails

- Use Squad Sandbox/Test Mode only.
- Keep the Kano pilot default payment mode as mock payment before and after the test.
- Do not commit Squad secret keys, webhook secrets, test cards or provider screenshots.
- Do not add Squad secret keys to frontend apps.
- Do not activate wallet funding, refunds, payouts or settlement automation.

## Environment Confirmation

| Item | Expected value/state | Result | Evidence |
| --- | --- | --- | --- |
| `PAYMENTS_PROVIDER` | `squad` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENT_PROVIDER` | `squad` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENTS_LIVE_ENABLED` | `false` | `Pass / Fail / Blocked` |  |
| `SQUAD_MODE` | `test` or `sandbox` | `Pass / Fail / Blocked` |  |
| Squad key type | Sandbox secret only, stored outside Git | `Pass / Fail / Blocked` |  |
| Squad base URL | Sandbox HTTPS host | `Pass / Fail / Blocked` |  |
| Webhook URL | `/api/v1/payments/webhook/squad` | `Pass / Fail / Blocked` |  |

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `SQUAD122-001` | Backend health before switch | `/api/v1/health` OK |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-002` | Initiate Squad payment | Backend returns HTTPS checkout URL/access code only |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-003` | Secret exposure check | No secret key/webhook secret in API response, frontend or logs |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-004` | Successful sandbox checkout | Squad accepts sandbox payment |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-005` | Manual backend verification | Payment becomes successful only after server verification |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-006` | Duplicate verification | No duplicate history, promo usage, notifications, settlement or earnings |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-007` | Failed/cancelled checkout | Order remains unpaid and retry is possible |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-008` | Invalid webhook signature | Webhook is rejected and payment is not processed |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-009` | Valid signed webhook where available | Webhook processes only matching amount/reference/currency |  | `Pass / Fail / Blocked` |  |
| `SQUAD122-010` | Rollback to mock | Mock checkout works after rollback |  | `Pass / Fail / Blocked` |  |

## Evidence Notes

| Evidence item | External reference | Masked? | Notes |
| --- | --- | --- | --- |
| Backend log reference |  | `Yes / No` |  |
| Provider dashboard reference |  | `Yes / No` | Store outside Git |
| Admin dashboard reference |  | `Yes / No` |  |
| Vendor dashboard reference |  | `Yes / No` |  |

## Decision

| Item | Record |
| --- | --- |
| Squad Sandbox verification | `Pass / Fail / Blocked / Not Run` |
| Safe to schedule another Squad sandbox window | `Yes / No / Conditional` |
| Mock restored after test | `Yes / No` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
