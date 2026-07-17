# Task 158 - Customer Squad Live Checkout UI QA

Date: 2026-07-17

## Purpose

Verify that the Customer App hides staging payment options and shows Squad by GTBank only when backend public payment config reports approved live Squad mode.

Do not include payment credentials, card details, bank details, OTPs, provider dashboard screenshots or customer private data in this QA record.

## Preconditions

| Check | Expected result | Status |
| --- | --- | --- |
| Backend Task 157 deployed | Backend starts with approved Squad live gate | Pending |
| Public payment config endpoint | `/api/v1/payments/public-config` responds | Pending |
| Admin Payment Readiness | Squad selected, live payments enabled, live activation ready | Pending |
| Customer App update/build | Includes Task 158 checkout changes | Pending |

## Live Squad UI Checks

| Scenario | Expected result | Status |
| --- | --- | --- |
| Load checkout after order creation | Payment section loads backend public config | Pending |
| Provider title | Shows `Payment provider` | Pending |
| Provider body copy | Shows secure approved-provider copy | Pending |
| Squad visibility | Shows only `Squad by GTBank` | Pending |
| Mock visibility | Mock Payment hidden | Pending |
| Monnify visibility | Monnify Sandbox hidden | Pending |
| Paystack visibility | Paystack Test Mode hidden | Pending |
| Squad button | Shows `Pay with Squad - NGN {amount}` or equivalent Squad payment copy | Pending |
| Provider request payload | Sends `paymentProvider: "squad"` | Pending |
| Initialization failure | Shows safe Squad-only retry/support copy | Pending |
| Payment success | Requires backend verification before order is marked paid | Pending |

## Staging Regression Checks

When `PAYMENTS_LIVE_ENABLED=false`:

| Scenario | Expected result | Status |
| --- | --- | --- |
| Mock staging checkout | Mock Payment remains visible | Pending |
| Monnify sandbox checkout | Monnify Sandbox remains available when backend config allows it | Pending |
| Paystack test checkout | Paystack Test Mode remains available when backend config allows it | Pending |
| Squad sandbox visibility | Squad Sandbox remains hidden unless explicitly enabled | Pending |
| Failed sandbox provider | Can guide tester back to Mock Payment | Pending |

## Safety Checks

- Customer App does not expose payment secrets.
- Public config does not expose admin diagnostics.
- Failed live Squad initialization does not create a paid order.
- Successful payment still requires backend verification.
- Callback/redirect alone does not mark payment successful.
- Wallet funding, automatic refunds and payout automation remain disabled.

## Current Result

```text
Task 158 QA status: Ready for deployment verification
Live payment test status: Not executed by this document
Production publishing: Not approved by this document
```
