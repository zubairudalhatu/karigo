# Task 122 Multi-Provider Sandbox Payment Closeout

## Purpose

Consolidate the Paystack, Monnify and Squad sandbox verification results and confirm
whether KariGO can schedule controlled provider-specific sandbox test windows.

This record does not approve live payment collection. The Kano pilot default remains
mock payment.

## Verification Inputs

- `docs/payments/multi-provider-sandbox-payment-foundation-task121.md`
- `docs/deployment/multi-provider-sandbox-payment-config-task121.md`
- `docs/deployment/sandbox-payment-verification-runbook-task122.md`
- `docs/qa/results/paystack-sandbox-verification-record-task122.md`
- `docs/qa/results/monnify-sandbox-verification-record-task122.md`
- `docs/qa/results/squad-sandbox-verification-record-task122.md`

## Consolidated Status

| Area | Status | Evidence reference | Notes |
| --- | --- | --- | --- |
| Mock payment default before tests | `Pass / Fail / Blocked / Not Run` |  |  |
| Paystack Test Mode verification | `Pass / Fail / Blocked / Not Run` |  |  |
| Monnify Sandbox verification | `Pass / Fail / Blocked / Not Run` |  |  |
| Squad Sandbox verification | `Pass / Fail / Blocked / Not Run` |  |  |
| Server-side amount/reference validation | `Pass / Fail / Blocked / Not Run` |  |  |
| Duplicate verification/webhook safety | `Pass / Fail / Blocked / Not Run` |  |  |
| Failed/cancelled payment safety | `Pass / Fail / Blocked / Not Run` |  |  |
| Webhook signature rejection | `Pass / Fail / Blocked / Not Run` |  |  |
| Provider secret exposure check | `Pass / Fail / Blocked / Not Run` |  |  |
| Rollback to mock after each provider | `Pass / Fail / Blocked / Not Run` |  |  |

## Provider Comparison Notes

| Provider | Checkout method | Verification method | Webhook header | Operational notes |
| --- | --- | --- | --- | --- |
| Paystack | Hosted authorization URL | Server-side verify endpoint | `x-paystack-signature` | Test Mode only |
| Monnify | Hosted checkout URL | Server-side verify endpoint | `monnify-signature` | Sandbox/Test Mode only |
| Squad | Hosted checkout URL | Server-side verify endpoint | `x-squad-encrypted-body` | Sandbox/Test Mode only |

## Safety Confirmation

| Safety item | Record |
| --- | --- |
| Live Paystack disabled | `Yes / No` |
| Live Monnify disabled | `Yes / No` |
| Live Squad disabled | `Yes / No` |
| `PAYMENTS_LIVE_ENABLED=false` confirmed | `Yes / No` |
| Mock payment restored | `Yes / No` |
| No frontend payment secrets | `Yes / No` |
| No committed provider credentials | `Yes / No` |
| Wallet auto-credit/refund remains disabled | `Yes / No` |
| Vendor/Captain payout automation remains disabled | `Yes / No` |
| Accelerate.ng utilities remain future/inactive | `Yes / No` |

## Final Decision

| Decision item | Record |
| --- | --- |
| Multi-provider sandbox foundation ready for scheduled verification | `Yes / No / Conditional` |
| Provider recommended for next controlled test window | `Paystack / Monnify / Squad / None` |
| Conditions before next test |  |
| Decision owner | `[Name]` |
| Decision date/time | `[DD Month YYYY, HH:MM]` |

## Follow-Up Tasks

- Future Task: Paystack Test Mode live staging evidence capture.
- Future Task: Monnify Sandbox live staging evidence capture.
- Future Task: Squad Sandbox live staging evidence capture.
- Future Task: Payment provider comparison and management selection.
- Future Task: Wallet refund and provider reconciliation flow.
