# Task 156 - Squad Live Payment Go/No-Go Record

Date: 2026-07-17

## Purpose

Record the final Go / Pause / No-Go decision for enabling Squad by GTBank for controlled live payment collection.

This is an operational decision record only. It does not activate live payments.

## Launch Payment Priority

| Priority | Provider | Status |
| --- | --- | --- |
| 1 | Squad by GTBank | Primary launch provider |
| 2 | Monnify | Pending approval / future secondary |
| 3 | Paystack | Pending approval / future secondary |
| Fallback | Mock payment | Staging/testing fallback only |

## Go Criteria

| Criterion | Status | Evidence owner |
| --- | --- | --- |
| Finance/management approval recorded outside Git | Pending |  |
| Squad live account approved | Pending |  |
| Required Render variables configured | Pending |  |
| Backend redeployed after env update | Pending |  |
| Admin Payment Readiness shows Squad live ready | Pending |  |
| Customer checkout shows Squad only in live mode | Pending |  |
| Mock hidden from public live checkout | Pending |  |
| Monnify and Paystack hidden from public live checkout | Pending |  |
| Callback/redirect URL verified | Pending |  |
| Signed webhook verified | Pending |  |
| Invalid webhook signature rejected | Pending |  |
| Low-value live payment verified | Pending |  |
| Order paid only after backend verification | Pending |  |
| Admin and Vendor records match payment status | Pending |  |
| Reconciliation owner assigned | Pending |  |
| Rollback steps rehearsed | Pending |  |

## Decision

Select one:

```text
GO - Enable controlled live Squad payments for approved launch scope
PAUSE - Keep live payments disabled while issues are resolved
NO-GO - Do not proceed with live Squad payments
```

Current decision:

```text
PAUSE - Waiting for environment configuration, webhook/callback verification and low-value live test execution
```

## Rollback / Pause Controls

If launch must be paused:

```text
PAYMENTS_LIVE_ENABLED=false
PAYMENTS_PROVIDER=mock
SQUAD_MODE=
SQUAD_LIVE_ACTIVATION_APPROVED=false
```

Then:

1. Redeploy backend.
2. Remove Customer live Squad launch mode.
3. Confirm public checkout no longer exposes live payment.
4. Keep mock available only for staging/internal testing.
5. Record payment reconciliation status before reopening checkout.

## Notes

- Do not store payment secrets in Git.
- Do not include full payment references or customer personal data in public reports.
- Do not activate Monnify or Paystack live checkout until each has separate approval.
- Do not use Mock payment for public live checkout after real payment launch.
