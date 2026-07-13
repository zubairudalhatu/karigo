# KariGO Mock Payment Pilot Guardrail - Task 110

Date prepared: 2026-07-13

## Selected Initial Payment Mode

The selected initial payment mode for the first Kano controlled early access pilot is:

```text
Mock payment
```

## Purpose

This guardrail prevents accidental payment-provider activation during the first pilot.
Paystack Test Mode is not activated for the initial pilot unless explicitly configured and
approved in a later task/decision.

## Required Provider State

| Provider/feature | Required state for initial pilot |
| --- | --- |
| Mock payment | Active |
| Paystack Test Mode | Not active unless separately approved later |
| Live Paystack | Disabled |
| Accelerate.ng utilities | Disabled / future integration |
| Termii SMS | Disabled / future integration |
| Wallet withdrawals | Disabled |
| Automatic refunds | Disabled |
| Payout automation | Disabled |
| Live rides / ride dispatch | Disabled |
| Pharmacy marketplace | Disabled/readiness-only |

## Audit Checks

| Check | Expected result | Status | Owner |
| --- | --- | --- | --- |
| Customer checkout uses mock payment | Mock payment completes without live provider call | Pending | QA Lead |
| Paystack Test Mode not configured for pilot | No pilot instruction depends on Paystack Test Mode | Pending | Technical Lead |
| Live Paystack disabled | No live payment collection | Pending | Technical Lead |
| Payment copy safe | Customer-facing copy does not promise live payment | Pending | QA Lead |
| Refund copy safe | No instant or automatic refund promise | Pending | Support Lead |
| Vendor payout copy safe | No automated payout promise | Pending | Vendor Coordinator |

## Hold Conditions

Hold pilot invitations if:

- any live payment collection is detected;
- Paystack Test Mode is enabled without approval;
- customer checkout can mark an order paid without backend verification;
- payment/refund/wallet copy implies live money movement;
- provider credentials appear in docs, screenshots, logs or chat.

## Approval

| Role | Decision | Name | Date | Notes |
| --- | --- | --- | --- | --- |
| Technical Lead | Approved / Hold |  |  |  |
| Finance/Admin | Approved / Hold |  |  |  |
| Pilot Lead | Approved / Hold |  |  |  |

