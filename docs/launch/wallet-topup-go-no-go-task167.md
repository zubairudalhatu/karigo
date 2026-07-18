# Task 167 - Wallet Top-Up Go/No-Go Record

## Launch Position

Wallet top-up may be enabled through Squad by GTBank after deployment and verification.

Wallet order payment remains disabled.

## Recommended State

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=true
WALLET_PAYMENTS_ENABLED=false
```

## Go Criteria

- Public config shows wallet top-up enabled.
- Customer Wallet can start Squad checkout externally.
- Pending ledger/payment records are created.
- Wallet balance is not credited at initialization.
- Backend verification/webhook credits wallet exactly once.
- Repeated verify/webhook does not double-credit.
- Admin Wallets shows top-up records safely.
- Wallet payment for orders remains unavailable in checkout.

## No-Go Criteria

- Wallet balance changes before backend verification.
- Verification or webhook can double-credit.
- Admin cannot see top-up record references/status.
- Customer App routes Squad checkout internally instead of externally.
- Wallet order payment becomes selectable while `WALLET_PAYMENTS_ENABLED=false`.
- Any secret or raw provider payload is exposed in UI/docs/logs.

## Decision

- Date:
- Reviewer:
- Result: `Go / Pause / No-Go`
- Evidence reference:
- Notes:
