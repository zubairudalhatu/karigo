# Payment Sandbox Activation Readiness Check

## Selection

- Selected provider: Paystack sandbox preparation
- Selection basis: existing backend adapter and Task 27 recommendation
- Formal management approval: **Not recorded** (`MDR-008` remains Open)
- Staging environment: designed/documented, but deployed separation is not evidenced in this repository

## Requirements

- [ ] Approved Paystack test-mode account
- [ ] Test credentials stored in the staging secret manager
- [ ] `PAYMENT_PROVIDER=paystack` configured only in staging
- [ ] Staging HTTPS webhook URL configured
- [ ] Staging callback URL and customer checkout return flow configured
- [ ] Provider-approved test account/test instrument available outside source control
- [x] Backend adapter, server verification, signature checks, amount/currency/reference checks
- [x] Database migrations and payment/webhook models ready
- [x] Mock payment fallback remains available
- [ ] Finance, Security, Engineering, and Management approval owners recorded

## Required Staging Variables

`PAYMENT_PROVIDER`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`,
`PAYSTACK_WEBHOOK_SECRET` when approved, `PAYSTACK_BASE_URL`,
`PAYSTACK_CALLBACK_URL`, `APP_URL`, and `CORS_ORIGINS`.

## Current Decision

- [ ] Ready for sandbox activation
- [x] Waiting for credentials
- [ ] Blocked by technical issue
- [x] Blocked by management approval and deployed staging evidence

Do not change `PAYMENT_PROVIDER` from `mock` until all applicable blockers above close.
