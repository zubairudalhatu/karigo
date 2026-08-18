# Utilities live acceptance

Run this checklist only after the deployed backend reports Accelerate Configuration Ready, Environment Live, Authentication Ready, Provider IP access VERIFIED, and Airtime API Reachable. Codex and automated tests must not execute a paid transaction.

## Controlled Airtime transaction

Prepare one controlled KariGO Customer, one owner-controlled Nigerian phone number, the smallest practical amount supported by the active Airtime provider, and sufficient available KariGO Wallet balance.

1. Keep `UTILITIES_CUSTOMER_PURCHASE_ENABLED=false` while reviewing readiness.
2. Set `UTILITIES_WALLET_PAYMENT_ENABLED=true` and `UTILITIES_LIVE_FULFILLMENT_ENABLED=true`; redeploy the backend.
3. Re-run the Admin non-destructive check. Stop if IP access is not `VERIFIED` or Airtime is not `REACHABLE`.
4. Record the wallet balance and confirm no earlier transaction uses the planned idempotency/quote reference.
5. The owner approves a single controlled Airtime attempt.
6. Open a tightly controlled launch window, set `UTILITIES_CUSTOMER_PURCHASE_ENABLED=true`, redeploy, and make only the approved Airtime purchase from the controlled Customer account. Do not retry a pending or uncertain vend.
7. Immediately set `UTILITIES_CUSTOMER_PURCHASE_ENABLED=false` and redeploy while evidence is reviewed.
8. Confirm a quote was generated and its quote reference became the transaction idempotency key.
9. Confirm the wallet was checked and debited exactly once for the correct total.
10. Confirm Accelerate validation and vend completed, one KariGO utility reference exists, and the provider reference was stored.
11. Confirm the Customer receipt shows the final status and never exposes a raw provider response.
12. In Admin Utilities, open the transaction and verify service, provider, amount, payment method, provider status/reference, wallet debit status, safe note, and created/updated time.
13. Use **Verify provider status** once if the transaction is non-terminal. Confirm requery reaches the final provider status without another vend.
14. Confirm no duplicate utility transaction, debit, or fulfilment exists.

If the result remains uncertain, keep customer purchase off and reconcile with the provider reference. Never mark an uncertain provider response successful.

## Failure and reversal acceptance

Use automated mocks unless Accelerate provides a non-financial failure case. Verify:

- provider fulfilment failure creates one wallet reversal;
- repeated submission with the same idempotency key does not double debit;
- repeated failed requery reuses the existing reversal and never credits twice;
- Admin shows a provider-safe note and debit/reversal references and statuses;
- Customer responses contain no raw provider payload, JWT, headers or credentials.

## Data and Cable TV

Data and Cable TV must remain `TEMPORARILY_UNAVAILABLE` while their readiness gate says live package codes are required. Confirm `DEMO_*` products remain blocked. For each provider-approved real package mapping, test customer/account validation before vend, exact package code, amount, provider reference, receipt and requery.

Cover DStv, GOtv, Startimes and any other provider only after Accelerate/iRecharge supplies approved codes. KariGO must not infer codes from display names.

## Electricity

For both prepaid and postpaid, verify meter/customer validation, amount, customer phone, provider code, validation reference, vend and requery. For prepaid, confirm the token is shown only on the Customer receipt and authorized Admin transaction detail, without the raw provider payload.

## Acceptance decision

After the one Airtime transaction passes all checks, the owner may approve controlled customer availability:

```text
UTILITIES_WALLET_PAYMENT_ENABLED=true
UTILITIES_LIVE_FULFILLMENT_ENABLED=true
UTILITIES_CUSTOMER_PURCHASE_ENABLED=true
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
```

Keep Data and Cable TV unavailable until their catalogue gates are `READY`. Expand one service at a time. Monitor Admin Utilities and the wallet ledger after redeployment.

## Rollback

At the first sign of provider, reconciliation, duplicate or receipt trouble:

1. Set `UTILITIES_CUSTOMER_PURCHASE_ENABLED=false` and the legacy alias false.
2. Redeploy and confirm the Customer app reports Preparing launch or Temporarily unavailable.
3. If necessary, set live fulfilment and wallet payment false and redeploy.
4. Preserve all history and reconcile pending provider references. Do not delete or rewrite wallet ledger evidence.
