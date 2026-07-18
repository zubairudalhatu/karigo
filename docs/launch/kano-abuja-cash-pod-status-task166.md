# Task 166 - Kano and Abuja Cash/POD Launch Status

## Launch Position

Cash / Pay on Delivery is approved as the first non-electronic fallback launch payment option for:

- Kano
- Abuja

Wallet remains readiness-only until Squad wallet top-up and wallet payment verification are completed.

## Recommended Current State

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

## Customer Experience

When Cash/POD is enabled, checkout should show:

- Pay with Squad
- Pay on Delivery

Wallet should stay hidden while both wallet flags are false.

## Admin Readiness Expectations

Admin Payment Readiness should show:

- Cash / Pay on Delivery enabled.
- Launch cities: Kano, Abuja.
- Customer selectable: Yes.
- Requires reconciliation: Yes.
- Admin reconciliation available: Yes.
- Captain cash collection confirmation available: Yes.
- Vendor visibility available: Yes.
- Wallet top-up disabled.
- Wallet payments disabled.

## Launch Guardrails

- Cash/POD is a manually reconciled payment method.
- Wallet top-up is not live.
- Wallet payment is not live.
- Payout automation remains disabled.
- Live provider credentials must stay in Render or approved secret manager only.

## Next Decision

After a successful low-risk Cash/POD order, decide whether to continue Cash/POD rollout in Kano and Abuja or pause for operations fixes.
