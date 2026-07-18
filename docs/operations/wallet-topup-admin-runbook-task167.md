# Task 167 - Wallet Top-Up Admin Runbook

## Purpose

Guide KariGO Operations and Finance through wallet top-up monitoring.

## Admin Portal

Use:

```text
Admin Portal -> Wallets -> Wallet top-up records
```

The table shows:

- Customer
- Amount
- Reference
- Status
- Provider
- Created date
- Verified date
- Safe failure note where applicable

Raw provider payloads and secrets are not displayed.

## Operational Rules

- Do not manually mark provider payments successful.
- Do not credit wallet from screenshots or customer claims.
- Use backend verification/webhook result as the source of truth.
- If a customer paid but wallet is still pending, compare the reference in Admin Wallets with the Squad dashboard.
- If provider confirms payment and backend did not receive verification/webhook, escalate to engineering with the reference only.
- Do not paste provider keys, cards, webhook secrets or raw payloads into tickets.

## Manual Adjustments

Manual wallet adjustments remain available only for approved corrections. They are not a replacement for provider verification.

Use an internal note and idempotency key where possible.

## Rollback

If wallet top-up causes operational risk:

```text
WALLET_TOP_UP_ENABLED=false
WALLET_PAYMENTS_ENABLED=false
```

Redeploy backend and confirm the Customer Wallet screen disables new top-ups.
