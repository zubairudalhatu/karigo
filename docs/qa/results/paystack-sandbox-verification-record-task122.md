# Task 122 Paystack Test Mode Verification Record

## Purpose

Record controlled Paystack Test Mode checkout verification for KariGO staging without
activating live Paystack.

## Guardrails

- Use Paystack Test Mode only.
- Keep the Kano pilot default payment mode as mock payment before and after the test.
- Do not commit Paystack keys, webhook secrets, test cards or provider screenshots.
- Do not add Paystack secret keys to frontend apps.
- Do not activate automatic wallet credit, refunds, payouts or settlement automation.

## Environment Confirmation

| Item | Expected value/state | Result | Evidence |
| --- | --- | --- | --- |
| `PAYMENTS_PROVIDER` | `paystack` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENT_PROVIDER` | `paystack` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENTS_LIVE_ENABLED` | `false` | `Pass / Fail / Blocked` |  |
| `PAYSTACK_MODE` | `test` | `Pass / Fail / Blocked` |  |
| Paystack key type | Test secret only, stored outside Git | `Pass / Fail / Blocked` |  |
| Callback URL | Staging URL only | `Pass / Fail / Blocked` |  |
| Webhook URL | `/api/v1/payments/webhook/paystack` | `Pass / Fail / Blocked` |  |

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `PAYSTACK122-001` | Backend health before switch | `/api/v1/health` OK |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-002` | Initiate Paystack payment | Backend returns HTTPS authorization URL/access code only |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-003` | Secret exposure check | No secret key/webhook secret in API response, frontend or logs |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-004` | Successful sandbox checkout | Provider accepts test payment |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-005` | Manual backend verification | Payment becomes successful and order becomes paid only after backend verify |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-006` | Duplicate verification | No duplicate history, promo usage, notifications, settlement or earnings |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-007` | Failed/cancelled checkout | Order remains unpaid and retry is possible |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-008` | Invalid webhook signature | Webhook is rejected and payment is not processed |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-009` | Valid signed webhook where available | Webhook processes only matching amount/reference/currency |  | `Pass / Fail / Blocked` |  |
| `PAYSTACK122-010` | Rollback to mock | Mock checkout works after rollback |  | `Pass / Fail / Blocked` |  |

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
| Paystack Test Mode verification | `Pass / Fail / Blocked / Not Run` |
| Safe to schedule another Paystack sandbox window | `Yes / No / Conditional` |
| Mock restored after test | `Yes / No` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
