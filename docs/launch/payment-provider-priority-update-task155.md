# Task 155 - Payment Provider Priority Update

Date: 2026-07-17

## Purpose

Record the launch-management decision to move Squad by GTBank to KariGO's primary launch payment provider.

## Reason For Change

```text
Squad by GTBank has approved KariGO and live credentials are available through secure operational channels.
Paystack approval is pending.
Monnify approval is pending.
Live payments remain disabled until final environment verification and approval.
```

## New Priority

| Priority | Provider | Status | Launch handling |
| --- | --- | --- | --- |
| 1 | Squad by GTBank | Approved / primary | Prepare live activation behind environment gates |
| 2 | Monnify | Pending approval | Future secondary provider |
| 3 | Paystack | Pending approval | Future secondary provider |
| Fallback | Mock payment | Staging only | Hide from public live checkout |

## Product And Operations Impact

- Admin Payment Readiness should show Squad as primary.
- Customer live launch mode should show Squad by GTBank only.
- Mock payment remains for staging/testing rollback.
- Monnify and Paystack remain in code and diagnostics but should not be public live checkout options until approved.
- Backend verification remains the payment source of truth.
- Wallet refunds, automatic refunds, wallet funding, settlements and payouts remain disabled.

## Required Approvals Before Live Payment

- finance owner approval;
- management go/no-go approval;
- Squad credential custody confirmation;
- webhook verification confirmation;
- reconciliation owner assignment;
- refund/escalation process confirmation;
- Customer App live payment mode confirmation;
- public live checkout smoke test approval.

## Current Go/No-Go

```text
Squad primary launch priority: Go
Live Squad payment activation: No-Go until environment verification
Monnify/Paystack public live checkout: No-Go until approval
Mock public live checkout: No-Go
Production publishing: unchanged
```

## Recommended Next Task

Task 156: Configure Squad Live Environment, Verify Webhook/Callback, and Execute Approved Low-Value Live Payment Test.
