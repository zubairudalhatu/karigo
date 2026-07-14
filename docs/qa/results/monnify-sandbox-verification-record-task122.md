# Task 122 Monnify Sandbox Verification Record

## Purpose

Record controlled Monnify Sandbox/Test Mode checkout verification for KariGO staging
without activating live Monnify.

## Guardrails

- Use Monnify Sandbox/Test Mode only.
- Keep the Kano pilot default payment mode as mock payment before and after the test.
- Do not commit Monnify API keys, secret keys, contract codes if treated as sensitive,
  webhook secrets, test instruments or provider screenshots.
- Do not add Monnify credentials to frontend apps.
- Do not activate wallet funding, refunds, payouts or settlement automation.

## Environment Confirmation

| Item | Expected value/state | Result | Evidence |
| --- | --- | --- | --- |
| `PAYMENTS_PROVIDER` | `monnify` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENT_PROVIDER` | `monnify` only during test window | `Pass / Fail / Blocked` |  |
| `PAYMENTS_LIVE_ENABLED` | `false` | `Pass / Fail / Blocked` |  |
| `MONNIFY_MODE` | `test` or `sandbox` | `Pass / Fail / Blocked` |  |
| Monnify credentials | Stored outside Git | `Pass / Fail / Blocked` |  |
| Monnify base URL | Sandbox HTTPS host | `Pass / Fail / Blocked` |  |
| Webhook URL | `/api/v1/payments/webhook/monnify` | `Pass / Fail / Blocked` |  |

## Test Matrix

| Test ID | Scenario | Expected result | Actual result | Status | Evidence reference |
| --- | --- | --- | --- | --- | --- |
| `MONNIFY122-001` | Backend health before switch | `/api/v1/health` OK |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-002` | Initiate Monnify payment | Backend authenticates server-side and returns hosted checkout URL |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-003` | Secret exposure check | No API key, secret key, webhook secret or contract credential in response/log/frontend |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-004` | Successful sandbox checkout | Monnify accepts sandbox payment |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-005` | Manual backend verification | Payment becomes successful only after server verification |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-006` | Duplicate verification | No duplicate history, promo usage, notifications, settlement or earnings |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-007` | Failed/cancelled checkout | Order remains unpaid and retry is possible |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-008` | Invalid webhook signature | Webhook is rejected and payment is not processed |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-009` | Valid signed webhook where available | Webhook processes only matching amount/reference/currency |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-010` | Unsigned webhook handling | Unsigned webhook does not mark payment paid |  | `Pass / Fail / Blocked` |  |
| `MONNIFY122-011` | Rollback to mock | Mock checkout works after rollback |  | `Pass / Fail / Blocked` |  |

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
| Monnify Sandbox verification | `Pass / Fail / Blocked / Not Run` |
| Safe to schedule another Monnify sandbox window | `Yes / No / Conditional` |
| Mock restored after test | `Yes / No` |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |
