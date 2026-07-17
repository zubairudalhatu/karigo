# Task 156 - Squad Live Environment Verification

Date: 2026-07-17

## Purpose

Prepare the operator checklist for configuring and verifying Squad by GTBank live payment environment variables before the approved low-value live payment test.

This document does not activate live payments and does not contain Squad credentials.

## Current Position

| Area | Status |
| --- | --- |
| Launch priority | Squad by GTBank is the primary launch provider |
| Monnify | Pending approval / future secondary provider |
| Paystack | Pending approval / future secondary provider |
| Mock payment | Staging/testing fallback only |
| Live payments | Not activated by this document |
| Backend health check | `https://karigo-8htn.onrender.com/api/v1/health` returned `200 OK` on 2026-07-17 |

## Required Render Variables

Set the following values only in Render or the approved secret manager. Do not paste values into Git, screenshots, logs or shared chat.

```text
PAYMENTS_LIVE_ENABLED=true
PAYMENTS_PROVIDER=squad
SQUAD_MODE=live
SQUAD_SECRET_KEY=
SQUAD_PUBLIC_KEY=
SQUAD_BASE_URL=
SQUAD_CALLBACK_URL=
SQUAD_WEBHOOK_SECRET=
SQUAD_LIVE_ACTIVATION_APPROVED=true
```

`SQUAD_PUBLIC_KEY` is optional unless the approved Squad checkout flow or dashboard requires it. Server-side initiation must use server-side credentials only.

## Render Setup Procedure

1. Open Render Dashboard.
2. Select the KariGO backend service.
3. Open Environment.
4. Add or update each required variable name.
5. Store real credential values only in Render.
6. Save changes.
7. Redeploy the backend service.
8. Confirm `/api/v1/health` responds after deployment.
9. Open Admin Portal as Super Admin.
10. Open Payment Readiness.
11. Confirm Squad by GTBank is shown as primary launch provider.
12. Confirm missing configuration list is empty for Squad live activation.

## Expected Admin Readiness Result

After Render variables are configured and the backend is redeployed, Admin Payment Readiness should show:

- Squad by GTBank as primary launch provider.
- Live mode enabled for Squad.
- Ready for live checkout.
- Webhook route available:

```text
/api/v1/payments/webhook/squad
```

- No secret values displayed.
- Monnify and Paystack shown as pending approval / future secondary providers.
- Mock payment shown as staging/testing fallback only.

## Expected Customer Checkout Result

Customer live launch mode should show only:

```text
Squad by GTBank
```

The following must be hidden from public live checkout:

- Mock Payment
- Monnify
- Paystack

Payment success must still require backend verification. The Customer App must not mark an order paid from a redirect alone.

## Verification Status

| Check | Result | Evidence |
| --- | --- | --- |
| Backend health reachable | Passed | `200 OK` from `/api/v1/health` on 2026-07-17 |
| Render live variables configured | Pending | Requires operator access to Render |
| Admin readiness verified | Pending | Requires Super Admin session after Render redeploy |
| Customer live checkout visibility verified | Pending | Requires Customer update/build in Squad live launch mode |
| Low-value live test executed | Pending | Requires finance/management approval |

## Activation Decision

```text
Current Task 156 status: Ready for operator configuration and verification
Live Squad payments: Not activated by this repository change
Low-value live payment test: Waiting for Render variables, approval and operator execution
```
