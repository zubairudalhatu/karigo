# Task 167 - Squad Wallet Top-Up Verification

## Objective

Verify that Squad wallet top-up can be initialized and credited only after backend verification.

## Environment Checklist

```text
CASH_ON_DELIVERY_ENABLED=true
WALLET_TOP_UP_ENABLED=true
WALLET_PAYMENTS_ENABLED=false
```

Confirm Squad live/test keys are configured only in Render or an approved secret manager.

## Test Steps

1. Confirm backend health at `/api/v1/health`.
2. Confirm `/api/v1/payments/public-config` shows wallet top-up enabled and wallet payments disabled.
3. Confirm Admin Payment Readiness shows:
   - Wallet top-up enabled: Yes
   - Wallet payments enabled: No
   - Provider for top-up: Squad by GTBank
   - Backend verification required: Yes
   - Client-side credit disabled: Yes
4. Open Customer App -> Profile -> KariGO Wallet.
5. Confirm wallet balance and transaction history load.
6. Enter a valid top-up amount at or above the configured minimum.
7. Start wallet top-up.
8. Confirm Squad checkout opens externally.
9. Return to the Wallet screen.
10. Confirm the app shows pending verification.
11. Complete provider payment.
12. Tap Verify wallet top-up.
13. Confirm balance updates only after backend verification succeeds.
14. Repeat Verify wallet top-up and confirm balance is not double-credited.
15. Open Admin Portal -> Wallets.
16. Confirm top-up record shows customer, amount, reference, status, provider, created date and verified date.
17. Confirm checkout still does not allow Pay from Wallet while `WALLET_PAYMENTS_ENABLED=false`.

## Failure Checks

- Cancelled provider checkout must not credit wallet.
- Failed verification must not credit wallet.
- Replayed webhook or repeated verification must not double-credit wallet.
- Admin Wallets must not expose raw gateway payloads or secret values.

## Evidence

- Tester:
- Date:
- Customer:
- Initial wallet balance:
- Top-up amount:
- Top-up reference:
- Provider status:
- Wallet balance after verification:
- Admin top-up record result:
- Issues:
- Go/Pause decision:
