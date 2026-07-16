# Task 137 Customer Test Payment Provider Selection QA Record

## Scope

Record controlled Customer App sandbox provider-selection testing for checkout and retry payment flows.

## Pilot Payment Position

| Area | Status |
| --- | --- |
| Default pilot payment mode | Mock payment |
| Live Paystack | Disabled |
| Live Monnify | Disabled |
| Live Squad | Disabled |
| Wallet auto-credit/refund | Disabled |
| Payout automation | Disabled |

## Test Matrix

| Test ID | Provider | Entry point | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| T137-001 | Mock | Checkout | Mock payment verifies through backend and order can proceed |  | `Pass / Fail / Blocked` |  |
| T137-002 | Paystack Test Mode | Checkout | Backend returns safe HTTPS authorization URL or fails closed if test credentials are absent |  | `Pass / Fail / Blocked` |  |
| T137-003 | Monnify Sandbox | Checkout | Backend returns safe HTTPS authorization URL or fails closed if sandbox credentials are absent |  | `Pass / Fail / Blocked` |  |
| T137-004 | Squad Sandbox | Checkout | Backend returns safe HTTPS authorization URL or fails closed if sandbox credentials are absent |  | `Pass / Fail / Blocked` |  |
| T137-005 | Mock | Order detail retry | Retry payment preserves mock backend verification |  | `Pass / Fail / Blocked` |  |
| T137-006 | Paystack/Monnify/Squad | Order detail retry | Retry payment sends selected sandbox provider and requires backend verification |  | `Pass / Fail / Blocked` |  |

## Evidence Rules

- Do not record payment secrets, provider keys, webhook secrets or test card details.
- Do not commit screenshots containing provider dashboard secrets.
- Mask customer phone numbers and email addresses in evidence.
- Record only provider name, order reference, payment reference, result and safe error text.

## Go/No-Go Notes

Sandbox provider-selection QA is complete only when:

- Mock payment remains the default and still works.
- Each sandbox provider either opens a backend-returned HTTPS checkout URL or fails closed with a safe configuration message.
- Backend verification is required for successful payment state.
- No live payment mode is enabled.
