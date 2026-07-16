# Task 146 - Monnify and Paystack Sandbox Readiness

Date: 2026-07-16

## Current Launch Payment Strategy

1. Monnify Sandbox is the primary launch verification provider.
2. Paystack Test Mode is the secondary launch verification provider.
3. Squad Sandbox is deferred until provider setup and API payload details are confirmed.
4. Mock payment remains the staging fallback and pilot rollback option.

Live payments remain disabled.

## Confirmed Status

Monnify Sandbox:

- Customer App checkout can open Monnify Sandbox hosted checkout.
- Admin Payment Readiness can test Monnify initialization.
- Backend verification is still required before an order is marked paid.

Paystack Test Mode:

- Customer App checkout can open Paystack Test Mode hosted checkout.
- Admin Payment Readiness can test Paystack initialization.
- Backend verification is still required before an order is marked paid.

Squad Sandbox:

- Backend adapter and Admin diagnostics remain available.
- Customer App checkout hides Squad for the launch candidate.
- Backend rejects customer-selected Squad unless `SQUAD_CUSTOMER_CHECKOUT_ENABLED=true` is explicitly configured later.
- Squad remains optional for a future provider-verification task.

Mock payment:

- Remains available for staging checkout and pilot fallback.
- Should remain the default rollback provider while sandbox providers are being verified.

## Environment Guardrails

Keep:

```text
PAYMENTS_LIVE_ENABLED=false
PAYMENTS_PROVIDER=mock
SQUAD_CUSTOMER_CHECKOUT_ENABLED=false
```

For launch-candidate checkout, customer-selectable providers should be:

```text
mock
monnify
paystack
```

Do not commit provider credentials, webhook secrets, test cards, callback secrets or `.env` files.

## Webhook Notes

Webhook secrets and dashboard callback settings still require final review before any live activation.

Required review areas:

- Monnify webhook signing and callback URLs.
- Paystack webhook signing and callback URLs.
- Provider dashboard business/account readiness.
- Backend verification still fails closed when provider evidence does not match order amount, currency or reference.

## Go-Live Recommendation

Proceed toward controlled payment readiness with:

- Monnify as primary;
- Paystack as secondary;
- Mock payment available for rollback;
- Squad deferred until a future provider-specific verification pass.

Live payment collection must remain disabled until a separate approval task configures production credentials and operational reconciliation.
