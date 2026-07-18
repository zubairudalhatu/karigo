# Task 170 Live Wallet and Payment Reconciliation Runbook

## Principles

- Squad by GTBank is the primary launch payment provider.
- Backend verification or webhook confirmation is the source of truth.
- The Customer App must never credit wallet balance or mark orders paid by itself.
- Wallet top-up credits post through the backend ledger only after payment verification.
- Wallet order payment remains controlled by `WALLET_PAYMENTS_ENABLED`.

## Operator Checks

1. Confirm `PAYMENTS_LIVE_ENABLED=true` only after live approval.
2. Confirm `PAYMENTS_PROVIDER=squad`.
3. Confirm Squad callback and webhook URLs are configured in the provider dashboard.
4. Confirm Admin Payment Readiness shows Squad live configured and no secret values.
5. Confirm wallet top-up is enabled only when `WALLET_TOP_UP_ENABLED=true`.
6. Confirm wallet order payments are enabled only when `WALLET_PAYMENTS_ENABLED=true`.
7. Monitor Admin Wallets for top-up records.
8. Match provider reference, payment record and wallet ledger entry by transaction reference.
9. If provider confirmation is delayed, leave the top-up pending.
10. If provider reports failed/cancelled, do not manually credit wallet without management-approved adjustment.

## Manual Adjustment Guardrail

Manual wallet adjustments must include a reason, Admin user audit trail and supporting internal reference. Do not use adjustments to bypass provider verification for customer top-ups.

## Data Never To Record In Git

- Squad secret key
- Squad webhook secret
- Payment authorization URLs
- Card details
- Raw provider payloads containing sensitive data
- OTPs
