# Task 186 - Accelerate Utilities Readiness Runbook

This runbook records KariGO's Accelerate.ng readiness posture for Bills & Utilities.

Accelerate.ng is approved as the future backend provider for airtime, data, electricity, cable TV and other supported utilities. This task prepares readiness visibility only. Customer utility purchases and live fulfilment remain disabled until a separate approved activation task.

## Current Posture

```text
Utilities provider readiness: Accelerate.ng
Customer utility purchase: Disabled
Utility live fulfilment: Disabled
Utility test mode: Enabled for controlled backend/admin readiness review
Wallet-to-utility payment: Future task, inactive
```

## Required Render Environment Keys

Use Render Dashboard -> KariGO backend service -> Environment -> Add/Update Variables -> Save -> Redeploy.

Recommended controlled readiness state:

| Variable | Recommended value or handling |
| --- | --- |
| `UTILITIES_PROVIDER` | `accelerate` |
| `UTILITIES_ENABLED` | `false` |
| `UTILITIES_TEST_MODE` | `true` |
| `UTILITIES_CUSTOMER_PURCHASE_ENABLED` | `false` |
| `ACCELERATE_ENABLED` | `true` |
| `ACCELERATE_BASE_URL` | Set the approved provider HTTPS base URL in Render only. |
| `ACCELERATE_API_KEY` | Set in Render or approved secret manager only. |
| `ACCELERATE_CLIENT_ID` | Set in Render only if required by the approved account. |
| `ACCELERATE_CLIENT_SECRET` | Set in Render only if required by the approved account. |
| `ACCELERATE_WEBHOOK_SECRET` | Set in Render only if required for callbacks. |

Do not commit Accelerate API keys, client secrets, merchant IDs, webhook secrets, test credentials or `.env` files.

## Admin Verification

Admin Payment Readiness should show:

- Provider: Accelerate.ng
- Account status: Approved
- Integration status: Readiness / controlled testing
- Customer purchases: Disabled until separately approved
- Required key names present/missing
- No secret values

Admin Utilities can continue to review current test-mode utility transaction records. It must not expose live fulfilment actions, provider tokens, or real utility delivery claims.

## Customer Guardrail

Customer Bills & Utilities screens may remain visible as preparing/test-mode surfaces, but customers must not be able to complete real utility purchases while:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
```

No real airtime, data, electricity token or cable subscription should be delivered from the current Customer App flow.

## Future Tasks

- Future Task: Accelerate.ng Utility Payment Integration
- Future Task: Wallet-to-Utility Payment Flow
- Future Task: Utility Provider Webhook Verification
- Future Task: Utility Purchase Customer Activation

## Verification Checklist

- [ ] Admin Payment Readiness shows Accelerate.ng readiness.
- [ ] Missing Accelerate key names are shown without values.
- [ ] Customer utility purchase remains disabled.
- [ ] Existing utility test-mode copy remains visible.
- [ ] No provider secret values are committed or displayed.
- [ ] Wallet-to-utility payment remains inactive.
