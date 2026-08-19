# Accelerate live Utilities catalogue — Task 209B-U2

This task prepares the production catalogue without executing a paid transaction or changing any Utilities purchase flag.

## Existing catalogue findings

The general seed contains only demo Utilities records:

- Airtime: MTN, Airtel, Glo and 9mobile providers and variable-amount products, all using `DEMO_*` codes and `demoOnly: true`.
- Data: four demo providers and four demo packages.
- Electricity: five demo providers and prepaid demo products.
- Cable TV: DStv, GOtv and Startimes demo providers/packages.

The production demo cleanup disables every provider/product whose code begins `DEMO_`. U2 readiness additionally requires explicit `catalogueMode: LIVE` and `integration: ACCELERATE` metadata, so demo, staging-shaped, inactive and unclassified records cannot make a gate ready.

Current blockers:

- Airtime: no active explicitly live provider after demo cleanup.
- Electricity: no owner/provider-confirmed live Disco records.
- Data: no owner/provider-confirmed live provider/package records.
- Cable TV: no owner/provider-confirmed live provider/package records.

## Confirmed Airtime configuration

The official Accelerate API Merchant Airtime contract publishes these accepted provider values:

- `MTN`
- `GLO`
- `AIRTEL`
- `9MOBILE`

It also publishes the aliases below, which U2 intentionally does not activate to avoid duplicate operator choices without owner confirmation:

- `ETISALAT`
- `T2MOBILE`

Source: <https://istrategytech.gitbook.io/accelerate/api-merchants/editor.md>

Airtime does not need product/package rows under the current readiness model. The controlled sync creates or activates only `MTN`, `GLO`, `AIRTEL` and `9MOBILE`, then marks them as explicit live Accelerate records. Activating `ETISALAT` or `T2MOBILE` later requires an owner decision based on the account's current provider list.

## Codes still required

Do not add or infer any of the following from display names:

- Electricity: the production provider codes enabled for KariGO's Accelerate merchant account, returned by `GET /merchant/power/providers` or confirmed by Accelerate. Both `PREPAID` and `POSTPAID` remain supported by the request flow.
- Data: provider values from `GET /merchant/data/providers`, plus every exact package code/name/amount from `GET /merchant/data/packages` for the approved provider.
- Cable TV: provider values from `GET /merchant/tv/providers`, plus exact package code/name/amount from `GET /merchant/tv/packages` for the approved provider.

Official discovery references:

- <https://istrategytech.gitbook.io/accelerate/api-merchants/openapi.md>
- <https://istrategytech.gitbook.io/accelerate/api-merchants/openapi-1.md>
- <https://istrategytech.gitbook.io/accelerate/api-merchants/power.md>

Data, Electricity and Cable TV remain blocked until those values are supplied and reviewed.

## Production-safe sync

The sync is additive and idempotent. It does not delete providers, products, transactions or wallet history. It does not touch unknown live codes, demo records, credentials, products, flags or Flutterwave. An existing approved Airtime code with the wrong service type blocks the entire operation.

Run the dry-run from the deployed backend environment first:

```bash
npm run sync:accelerate-catalogue --workspace @karigo/backend-api -- --dry-run
```

Review every proposed code and count. The dry-run performs reads only.

After owner approval, execute once from the production backend environment:

```bash
CONFIRM_ACCELERATE_LIVE_CATALOGUE_SYNC=true npm run sync:accelerate-catalogue --workspace @karigo/backend-api -- --execute
```

Codex must not execute the production mutation. Re-running the command is safe: records are keyed by unique provider code and already-correct records become `NO_CHANGE`.

## Paid flags and first Airtime next step

Keep all of these false during catalogue sync and readiness verification:

```text
UTILITIES_CUSTOMER_PURCHASE_ENABLED=false
UTILITIES_CUSTOMER_PURCHASES_ENABLED=false
UTILITIES_WALLET_PAYMENT_ENABLED=false
UTILITIES_LIVE_FULFILLMENT_ENABLED=false
```

After the production sync:

1. Re-run Admin Payment Readiness.
2. Require Accelerate auth `READY`, provider IP access `READY`, Airtime API `REACHABLE`, and Airtime catalogue `READY`.
3. Only after all four are proven, set `UTILITIES_TEST_MODE=false` in Render while leaving all four paid flags above false, then redeploy the backend.
4. Follow `docs/qa/utilities-live-acceptance.md` for a separately owner-approved, single controlled Airtime transaction window. Do not enable or transact as part of U2.
