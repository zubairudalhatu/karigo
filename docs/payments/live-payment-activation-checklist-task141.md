# Task 141 - Live Payment Activation Checklist

## Purpose

This checklist defines the controlled path from mock/sandbox payment readiness to
live payment activation. It does not activate live Paystack, live Monnify, live
Squad, wallet top-up, automatic refunds, withdrawals, payouts or utility
fulfilment.

## Current Payment Position

| Provider | Current State | Activation Position |
| --- | --- | --- |
| Mock | Working | Required rollback/fallback |
| Paystack | Sandbox foundation exists; safe failure messaging exists | Live not active |
| Monnify | Sandbox foundation exists; safe failure messaging exists | Live not active |
| Squad | Sandbox foundation exists; safe failure messaging exists | Live not active |

Current provider adapters are intentionally test/sandbox guarded. Live activation
requires a separate engineering approval step before any production key can be
accepted.

## Provider Selection Gate

- [ ] Management approves the first live payment provider.
- [ ] Finance approves provider settlement, fee and reconciliation process.
- [ ] Technical Lead approves live-mode implementation and rollback plan.
- [ ] Legal/Compliance reviews payment terms, refund policy and privacy notices.
- [ ] Support team receives payment issue scripts.
- [ ] Provider account ownership and dashboard access are documented outside Git.

## Sandbox Certification Gate

For the selected provider:

- [ ] Sandbox credentials stored only in staging secret manager.
- [ ] Hosted checkout opens from Customer App.
- [ ] Customer can return and verify payment through backend.
- [ ] Backend marks payment successful only after provider verification.
- [ ] Cancelled/failed payment remains unpaid.
- [ ] Duplicate verification is idempotent.
- [ ] Webhook signature verification works.
- [ ] Duplicate webhook is ignored safely.
- [ ] Amount, currency and reference mismatch are rejected.
- [ ] Customer, Vendor and Admin views show consistent payment status.
- [ ] Mock payment still works after provider test.

## Live Engineering Gate

Before live credentials are used:

- [ ] Backend code explicitly supports the selected provider's live mode.
- [ ] `PAYMENTS_LIVE_ENABLED=true` is accepted only for the selected provider.
- [ ] Live key format and live API host are validated.
- [ ] Non-selected providers remain disabled.
- [ ] Frontend never receives provider secret keys.
- [ ] Webhook signature validation remains mandatory.
- [ ] Provider errors return safe customer-facing messages.
- [ ] Provider logs do not expose secrets or full card/account data.
- [ ] Refund automation remains disabled unless separately approved.
- [ ] Wallet credit/debit automation remains disabled unless separately approved.

## Production Secret Gate

Store values only in the production platform secret manager. Leave this document
blank.

```text
PAYMENTS_PROVIDER=
PAYMENT_PROVIDER=
PAYMENTS_LIVE_ENABLED=false
```

Selected-provider live variables must be stored only in the secret manager. Do not
commit live keys, webhook secrets, public keys, dashboard screenshots, test cards,
bank details or production callback tokens.

## Production Cutover Sequence

1. Confirm no P0/P1 defects are open.
2. Confirm selected provider sandbox certification is complete.
3. Confirm management, finance and technical approvals are signed.
4. Confirm backend release containing live-mode guardrails is deployed.
5. Set production secret-manager values for the selected provider only.
6. Configure provider callback and webhook URLs.
7. Redeploy backend.
8. Run production smoke test with a controlled low-value transaction if approved.
9. Verify order/payment state in Customer App, Vendor Dashboard and Admin Portal.
10. Verify provider dashboard record.
11. Record the result in the go-live verification record.

## Rollback

If live payment cutover fails:

1. Set production payment provider back to mock or disable live payment checkout
   according to the approved rollback decision.
2. Redeploy backend.
3. Confirm Customer App no longer starts live provider checkout.
4. Preserve provider dashboard evidence outside Git.
5. Reconcile any attempted transaction with Finance.
6. Record incident, cause, action and next decision.

## Activation Decision

| Item | Status |
| --- | --- |
| Selected provider | `Paystack / Monnify / Squad / TBD` |
| Sandbox certification complete | `Yes / No` |
| Live engineering gate complete | `Yes / No` |
| Live credentials received securely | `Yes / No` |
| Webhook/callback production setup complete | `Yes / No` |
| Finance reconciliation ready | `Yes / No` |
| Management approval | `Yes / No` |
| Live activation approved | `Yes / No` |

## Current Decision

```text
Live payment activation: Not approved.
Reason: sandbox provider verification, live-mode engineering gate, production
secret setup and finance/management approval are still required.
```
