# Task 142 - Payment Provider Readiness Verification

## Purpose

Use this record to verify KariGO sandbox payment readiness after the backend
diagnostics endpoint is deployed. This record does not activate live payment
collection.

## Environment

| Item | Value |
| --- | --- |
| Backend API | `https://karigo-8htn.onrender.com/api/v1` |
| Default pilot payment | `Mock payment` |
| Live payments | `Disabled` |
| Wallet top-up/refund automation | `Disabled` |
| Payout automation | `Disabled` |

## Readiness Endpoint Verification

| Test ID | Check | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T142-READ-001` | Admin calls provider readiness endpoint | Admin receives readiness response | `Pending / Pass / Fail` |  |
| `T142-READ-002` | Unauthenticated request | Request is rejected | `Pending / Pass / Fail` |  |
| `T142-READ-003` | Secret values | No secret values are returned | `Pending / Pass / Fail` |  |
| `T142-READ-004` | Mock status | Mock provider remains ready | `Pending / Pass / Fail` |  |
| `T142-READ-005` | Live activation block | Live activation remains blocked | `Pending / Pass / Fail` |  |

## Provider Configuration Checks

| Provider | Required checks | Status | Notes |
| --- | --- | --- | --- |
| Paystack | `PAYSTACK_MODE=test`, test secret configured, HTTPS base URL, callback/webhook reviewed | `Pending / Ready / Blocked` |  |
| Monnify | `MONNIFY_MODE=sandbox`, API key, secret, contract code, HTTPS sandbox base URL | `Pending / Ready / Blocked` |  |
| Squad | `SQUAD_MODE=sandbox`, sandbox secret, HTTPS sandbox base URL, callback/webhook reviewed | `Pending / Ready / Blocked` |  |

## Controlled Checkout Verification

Run only after a provider status is `READY`.

| Test ID | Scenario | Expected Result | Status | Evidence |
| --- | --- | --- | --- | --- |
| `T142-PAY-001` | Mock checkout fallback | Order can still be paid with mock payment | `Pending / Pass / Fail` |  |
| `T142-PAY-002` | Paystack hosted checkout | Backend returns Paystack Test Mode checkout URL | `Pending / Pass / Fail / Blocked` |  |
| `T142-PAY-003` | Monnify hosted checkout | Backend returns Monnify sandbox checkout URL | `Pending / Pass / Fail / Blocked` |  |
| `T142-PAY-004` | Squad hosted checkout | Backend returns Squad sandbox checkout URL | `Pending / Pass / Fail / Blocked` |  |
| `T142-PAY-005` | Provider failure | Customer sees safe fallback message and order remains unpaid | `Pending / Pass / Fail` |  |
| `T142-PAY-006` | Backend verification | Payment is marked successful only after backend verification/webhook | `Pending / Pass / Fail / Blocked` |  |
| `T142-PAY-007` | Amount mismatch | Mismatch is rejected | `Pending / Pass / Fail / Blocked` |  |
| `T142-PAY-008` | Duplicate verification | Duplicate verification is idempotent | `Pending / Pass / Fail / Blocked` |  |

## Current Result

```text
Ready for deployment of diagnostics. Actual provider sandbox checkout remains
waiting for staging secret-manager values and provider dashboard callback/webhook
verification.
```

## Signoff

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Technical Lead |  | `Go / Conditional / No-Go` |  |  |
| Operations |  | `Go / Conditional / No-Go` |  |  |
| Finance |  | `Go / Conditional / No-Go` |  |  |
