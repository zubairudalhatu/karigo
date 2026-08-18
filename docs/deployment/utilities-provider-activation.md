# Accelerate Utilities production activation

This runbook activates the existing KariGO Utilities architecture for Airtime, Data, Electricity and Cable TV. It does not authorize an automated or unrestricted paid launch.

## Approved integration contract

Authentication is `GET /api/v1/auth/api-client/token` with HTTP Basic auth using `ACCELERATE_API_PUBLIC_KEY` and `ACCELERATE_API_PRIVATE_KEY`.

The code's live defaults are:

- Auth: `https://prod.user-mgt.irechargetech.com`
- Airtime, Data and Cable TV: `https://prod.airtime-data.irechargetech.com`
- Electricity: `https://prod.power.irechargetech.com`

Repository and deployment documentation contain no evidence that these approved defaults have been superseded. Configure an override only when Accelerate/iRecharge supplies and approves it.

## Render environment contract

Configure these foundation values in the backend service without committing their values:

```text
UTILITIES_PROVIDER_ENABLED=true
UTILITIES_PROVIDER=accelerate
UTILITIES_PROVIDER_NAME=accelerate
UTILITIES_ENABLED=true
ACCELERATE_ENABLED=true
ACCELERATE_UTILITIES_ENABLED=true
ACCELERATE_ENV=live
ACCELERATE_API_PUBLIC_KEY=<Render secret>
ACCELERATE_API_PRIVATE_KEY=<Render secret>
```

Provider-approved overrides are optional: `ACCELERATE_AUTH_URL`, `ACCELERATE_AIRTIME_DATA_BASE_URL`, `ACCELERATE_POWER_BASE_URL`, and `ACCELERATE_WEBHOOK_SECRET`.

Keep all paid gates off during deployment and connectivity acceptance:

```text
UTILITIES_TEST_MODE=false
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
```

`UTILITIES_CUSTOMER_PURCHASES_ENABLED` is a legacy compatibility alias. Prefer the singular variable for new configuration.

## Connectivity and IP allowlist acceptance

1. Redeploy the backend with the foundation configuration.
2. Sign in to Admin Portal with an authorized Admin role.
3. Open **Payment Readiness** and select **Run non-destructive Accelerate check**.
4. Confirm Environment is Live, Configuration and Authentication are Ready, and the four API routes are Reachable.
5. Accept provider IP access only when the result is `VERIFIED`.

The check authenticates from the deployed backend and sends authenticated `OPTIONS` probes to the existing validation routes. It does not validate customer data, debit a wallet, or vend a service. `VERIFIED` is returned only after actual provider responses contain no known IP allowlist denial. `NOT_VERIFIED` means customer-paid gates remain off.

Never copy keys, JWTs, Authorization headers, or raw provider payloads into screenshots, tickets, logs, or this runbook.

## Catalogue gates

Airtime and Electricity use provider codes and variable amounts. Data and Cable TV additionally require active, provider-approved package codes. Any code prefixed `DEMO_` is blocked from live purchase and does not satisfy readiness.

Do not invent Data or TV codes. Load only an explicit operator-managed mapping supplied by Accelerate/iRecharge, or use an approved catalogue endpoint if the provider documents one. No such catalogue endpoint is assumed by KariGO.

Electricity acceptance must cover prepaid and postpaid meters, validation reference, amount, customer phone, provider, vend, requery and safe display of a returned prepaid token.

## Controlled activation and rollback

After connectivity succeeds, enable wallet and fulfilment while customer purchase remains off:

```text
UTILITIES_WALLET_PAYMENT_ENABLED=true
UTILITIES_LIVE_FULFILLMENT_ENABLED=true
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
```

The owner must explicitly approve the one-transaction Airtime window described in the QA runbook before enabling the customer gate. Airtime is first because it has no Data/TV package-code dependency.

Immediate rollback:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
```

Redeploy after an environment change. Rollback does not delete transaction history, wallet ledger entries, provider references, receipts, or reconciliation evidence.
