# PAY-01 — Squad payment migration readiness audit

2026-11-15. Audit/planning only. No provider switch, credential change, dashboard/webhook change, transaction, refund, staging configuration, deployment, OTA or Customer/Captain modification is authorized or performed.

## Decision

Keep Flutterwave operating unchanged. Squad is implemented but is not a configuration-only replacement. First build a separately approved, isolated payment-sandbox workstream; resolve provider routing, webhook/verification, concurrency, reconciliation/refund and client-return gaps before considering any live canary.

```ini
CURRENT_PRIMARY_PROVIDER = flutterwave
CURRENT_SECONDARY_PROVIDER = NONE_ACTIVE
SQUAD_ADAPTER_EXISTS = YES
SQUAD_TEST_MODE_READY = NO
PAYMENT_RUNTIME_PROVIDER_NEUTRAL = NO
WEBHOOK_PROVIDER_ISOLATION_READY = NO
RECONCILIATION_PROVIDER_ISOLATION_READY = NO
REFUND_REVERSAL_READY = NO
IDEMPOTENCY_READY = NO

PRODUCTION_PROVIDER_SWITCH_REQUIRED = YES
DATABASE_MIGRATION_REQUIRED = YES
CLIENT_CHANGE_REQUIRED = YES

PRODUCTION_CHANGED = NO
LIVE_PROVIDER_CONFIG_CHANGED = NO
READY_FOR_PAY_02_SQUAD_STAGING = YES
```

Interpretation: NO readiness flags mean insufficient for safe full migration, not that every existing protection is absent. The database flag covers the recommended durable attempt/webhook/refund/reconciliation design below; the existing SQUAD order enum and string gateway columns already permit a basic Squad order attempt without an enum migration. Production switch is a future requirement for the stated objective, not an action now. PAY-02 readiness means the bounded plan is ready for separate approval, not that sandbox credentials or live cutover are certified.

## Evidence and current Production posture

- Deployed backend: `c907d04b11c1b08cf57c0c82cff604abee07918e`, Render `dep-dbd8gquq1p3s73cstagg`. Latest live deployment was rechecked read-only. Local audit base is Partner P3A.1 plus its documentation-only boundary closeout. Payment runtime differs from deployed code only by P1's transactional Partner paid-order push outbox addition; that addition is not claimed as a Production payment protection.
- GET `https://karigo-8htn.onrender.com/api/v1/payments/public-config` confirms live Flutterwave, sole selectable provider flutterwave, ready=true; Squad/Paystack/Monnify/mock hidden; Cash/POD enabled. Wallet top-up enabled through Flutterwave with minimum NGN 100; general wallet order payments disabled. Utilities customer purchases, wallet debits and live Accelerate fulfilment are separately enabled.
- Existing authenticated Render Production web shell was used strictly read-only. A standalone Prisma client ran aggregate groupBy queries inside a transaction explicitly set `SET TRANSACTION READ ONLY`. No Nest app was bootstrapped, provider was called, row was written, file was written on Production or environment variable modified.
- Safe whitelist flags: PAYMENTS_PROVIDER=PAYMENT_PROVIDER=flutterwave; PAYMENTS_LIVE_ENABLED=true; FLUTTERWAVE_ENVIRONMENT=live; FLUTTERWAVE_API_MODE=v3. SQUAD_MODE=live, SQUAD_LIVE_ACTIVATION_APPROVED=true and SQUAD_CUSTOMER_CHECKOUT_ENABLED=false. Existing historical activation flag is not fresh authorization or certification.
- Presence only, never values: Squad secret/webhook/callback/base URL all present; Flutterwave secret key and secret hash present; alternate Flutterwave webhook-secret variable absent; Paystack secret and Monnify API/secret keys present. Presence does not establish validity, environment match, dashboard configuration or current provider connectivity. No existing key is rotated/replaced/disabled.
- RIDES_PAYMENT_ENABLED=false. Captain commission payment enabled with Flutterwave. PARTNER_ONBOARDING_PAYMENT_ENABLED unset (default false). Wallet/utilities flags match the public config.
- Aggregate Payment, PaymentWebhookLog, TaxiRideCommissionPayment and PartnerOnboardingPayment queries returned no groups, hence zero rows in those four current tables. This is a point-in-time database observation, not proof of no merchant-side charges or historical business activity. Merchant dashboards/statements and external webhook configuration were not inspected; reconcile those independently before cutover.
- Existing unit-only/mock tests: six suites, 78 tests PASS (`pay-01-existing-mocked-tests.log`); includes Squad adapter, registry, payment service, safe evidence, commission and onboarding fee paths. No Squad sandbox/live transaction was made.

## Architecture and flow inventory

| Flow | Current implementation / provider | Squad migration implication |
| --- | --- | --- |
| Customer marketplace/food/grocery/parcel order checkout | PaymentsService + PaymentProviderRegistry; Flutterwave v3 hosted checkout in Production | Registry, OrdersService gates and Customer checkout explicitly pin Flutterwave; all must become approved provider-aware |
| Customer wallet top-up | Pending Payment + pending ledger entry; Flutterwave only; server verification/webhook credits | Cannot switch with global flag alone; preserve ledger IDs/balances and verify once-only credit under concurrency |
| Wallet order payment | WALLET_PAYMENTS_ENABLED=false | Keep disabled; do not activate it as part of acquiring-provider migration |
| Utilities wallet-funded purchase | Separate utilities provider/fulfilment and debit/reversal logic; public config reports Accelerate live | Squad is an acquirer, not a substitute for the utility fulfiller. Keep fulfilment and compensation policy unchanged |
| Customer Ride fare | Cash-oriented controlled workflow; online automation guarded off | Do not advertise/enable Squad Ride fares without a separate approved fare/settlement design |
| Captain service-fee/commission remittance | RideCommissionPaymentService; enabled, provider must be flutterwave | Separate later cohort; preserve remittance allocations/outstanding policy, do not confuse with customer Ride fare |
| Partner onboarding fee | PartnerOnboardingPaymentService hardcodes flutterwave; Production flag unset/off | Remains deferred under Partner hold; future migration separate from order canary |
| Cash/POD | Cash pending and Operations reconciliation, not an online provider | Preserve current launch restrictions and cash reconciliation; never reinterpret as paid Squad transaction |
| Refunds | Customer request + admin approval changes KariGO payment/order states | No implemented provider refund contract/API; internal REFUNDED is not evidence of funds returned |
| Vendor/Captain settlements | Internal business/financial records and admin workflows | Distinguish these from Squad merchant acquiring settlements; merchant statement/batch reconciliation is not implemented |

Registered adapters are mock, Paystack, Flutterwave, Monnify and Squad. Paystack and Monnify implementations enforce test/sandbox-only use and reject global live mode. Mock is for controlled non-live operation. Squad supports adapter-level initialize/verify/signed-webhook parsing but its live-mode checks require the globally selected provider to be squad. Flutterwave supports v3/v4 code, but Production is v3. PlaceholderPaymentProvider is an unregistered abstract placeholder, not another active acquirer. Stored credentials do not make a provider an active secondary/fallback.

Source anchors: `services/backend-api/src/modules/payments/{payments.module.ts,payments.service.ts,payments.controller.ts,ride-commission-payment.service.ts,partner-onboarding-payment.service.ts}`, `providers/{payment-provider.interface.ts,payment-provider.registry.ts,squad.provider.ts,paystack.provider.ts,monnify.provider.ts,flutterwave.provider.ts}`, `modules/orders/orders.service.ts`, `modules/wallet/wallet.service.ts`, `modules/utilities/utilities.service.ts`, `modules/taxi/taxi.service.ts`.

## Required Squad capabilities and current evidence

| Requirement | Evidence / gap |
| --- | --- |
| Hosted customer/order checkout | Adapter POST /transaction/initiate, amount in minor units, NGN, HTTPS returned URL; mocked tests pass. Current merchant sandbox/live end-to-end is unverified |
| Customer Ride payment | No approved active online Ride-fare flow to substitute; deferred independently |
| Webhook verification | Raw-body SHA-512 HMAC + timing-safe comparison implemented; x-squad-encrypted-body used. Confirm the current official signing-key contract, raw serialization, response acknowledgement and event shapes before credential setup |
| Server verification | GET /transaction/verify/:reference adapter exists; requires successful status. Harden mandatory amount/currency/reference validation, rather than allowing omitted evidence/fallback reference |
| Reconciliation | Per-reference verification and admin lists exist; no complete Squad transaction/merchant-statement/settlement batch importer or discrepancy queue |
| Refund/reversal | Adapter interface has no refund API. Utilities' internal wallet compensation is not a provider refund. Need explicit merchant refund lifecycle and evidence |
| Settlement visibility | Internal KariGO settlements are not Squad payout batches. Current Squad merchant dashboard/API entitlement, timing, fees and reporting must be confirmed with current docs/merchant support |

The historical official [Squad refund documentation](https://squadinc.gitbook.io/squad-api-documentation/refund-api) describes full/partial refunds requiring both merchant transaction_ref and gateway_transaction_ref. Its [webhook documentation](https://squadinc.gitbook.io/squad-api-documentation/webhook-and-redirect-url) shows a separate gateway_ref and warns against double value. Both pages explicitly state they were deprecated on 2025-09-08 and point to [current Squad documentation](https://docs.squadco.com/), which returned 403 during this audit. These historical pages are gap-identification evidence, not current API certification. Obtain current merchant documentation before PAY-02 transaction execution; no third-party SDK/readme was treated as an authoritative contract.

Historical repository task122 sandbox and task155/156/167 live/wallet records examined contain templates, blank results or pending steps. Task173 describes earlier Squad work, while task186 describes later Flutterwave posture. Neither prose nor file naming establishes a completed current Squad test. Current Production flags/source take precedence. No historical completed Squad transaction evidence was found in the examined records.

## Safety findings and exact coupling

1. **Configuration-only switch is blocked.** Registry.active/customerTestProvider/customerCheckoutProviders enforce Flutterwave when PAYMENTS_LIVE_ENABLED=true. OrdersService separately gates FLUTTERWAVE and SQUAD enums. Public config hardcodes Flutterwave labels/top-up provider and defines Squad readiness only when not live. Squad live provider code separately requires globally selected squad: current historical Squad credentials alone cannot activate it.
2. **Webhook continuity across a switch/rollback is not ready.** Gateway-specific URL and provider equality checks exist, but controller selects the first nonempty signature among all provider headers instead of selecting by gateway. Squad's mode/selection checks can reject legitimate late Squad webhooks once selection returns to Flutterwave. Sandbox Paystack/Monnify adapters also depend on the global live flag. Decouple receive/verify credentials/mode from the provider selected for new checkouts; preserve existing Flutterwave receiver credentials and endpoint throughout migration.
3. **Signed webhook versus independent verification.** Generic order/wallet webhook processing trusts successful authenticated parsed webhook evidence and does not independently call provider.verify. Commission/onboarding webhook paths do independently verify. Require current provider contract checks and authoritative server verification before posting value; durable receipt then retry verification on provider outage rather than holding/losing the only delivery.
4. **Evidence can be incomplete.** PaymentsService.assertProviderEvidence checks reference, but validates currency/amount only when supplied. Squad verify falls back to the requested reference when response omits it. Require explicit exact reference, currency and integer minor amount, plus successful status and correct merchant account/environment. Do not accept a signed but incomplete event as paid.
5. **Idempotency is partial.** Payment.transactionReference is unique; webhook log uniqueness is `(gateway,eventType,transactionReference)`; repeated completed calls short-circuit. These are useful repeat guards, not complete request/concurrency protection. Initialization creates a new Payment/reference each time, with no stable client idempotency key or one-active-attempt rule. Ordinary order/wallet completion uses read/check/write transactions without payment/order/wallet row locks or compare-and-set claims. Two different attempts on one order, verify-versus-webhook races and simultaneous wallet credits need real-database tests and serialization.
6. **Late-state handling needs a review state.** Generic completion blocks only already SUCCESSFUL payments before writing SUCCESSFUL. Inspect/test late events for CANCELLED, REFUND_PENDING and REFUNDED paths; do not allow late receipts to silently reclassify refund state or fulfil closed work. This is a source-level risk, not an observed Production incident.
7. **Ambiguous initialization/retry.** Provider timeout is bounded (Squad 10 seconds), but a failed/unknown initialization may be recorded FAILED after the provider created a chargeable intent. Retrying creates a new reference. Keep UNKNOWN/PENDING_REVIEW states, verify the original attempt and prohibit automatic cross-provider retry until its outcome is resolved. There is no safe implemented live automatic fallback.
8. **Refund truthfulness.** approveRefund changes internal status to REFUNDED without invoking any provider or recording external completion proof. Keep automatic refunds disabled and require Finance-reviewed evidence before asserting a provider refund; add pending/submitted/confirmed/failed states rather than treating administrative approval as settlement.
9. **Reconciliation references are only partly neutral.** Gateway is a string and transaction references are unique strings, so existing rows can remain immutable and route to their recorded provider. However paymentProviderEvidence currently extracts provider IDs mainly from Flutterwave flw_ref/id fields, not Squad Body.gateway_ref. Preserve the exact necessary Squad gateway reference in a sanitized typed field before raw payload minimization; never restore full payload/card/PII persistence. Fee tables also use globally unique providerTransactionReference: future design should scope provider references by provider/environment/account to avoid cross-provider collisions.
10. **Callback/return coupling.** Squad initialize uses SQUAD_CALLBACK_URL rather than InitializePaymentInput.redirectUrl, so wallet-specific return targets cannot be assumed to work. Customer checkout explicitly posts paymentProvider=flutterwave, its live option/fallback logic recognizes Flutterwave, Wallet requires walletTopUpProvider=flutterwave, website has `/payment/flutterwave/return`, Captain earnings restricts checkout hosts to flutterwave.com, and Partner fee code/UI is Flutterwave-oriented. Generic API types already include squad and generic authorization URL aliases, but the runtime/UI is not neutral.

Do not infer these risks caused a historical loss: the audited current payment tables were empty. Empty local tables also cannot establish that the merchant dashboards have no outstanding activity.

## Database and ledger plan (proposal only)

Existing Payment gateway/status/purpose, transactionReference, order SQUAD enum and fee provider columns avoid a wholesale data conversion. Preserve all existing amounts, wallet balances, references, provider names, history and receipt relationships. Never rewrite Flutterwave payments as Squad.

Recommended additive expand-only migration for full standardization: durable payment attempts with `(actor,purpose,idempotencyKey)` uniqueness and input fingerprint; provider/environment/merchant-account identity; provider transaction reference with scoped uniqueness; per-order active/successful-attempt claims; durable webhook inbox with provider event identity/body digest, receive/processing/verification status and safe retention; reconciliation discrepancies and refund attempts/external outcomes. Use row locks or conditional transitions for payment/order and wallet ledger posting. Existing unique ledger reference remains useful, but needs an atomic claim and wallet update. A minimal order-only prototype could use current tables plus locking; that is not the full production migration proposed here. Draft exact DDL/backfill/rollback only in separately authorized implementation work.

## SQUAD_STAGING_TEST_PLAN — proposed PAY-02

1. Approval and merchant preflight first: obtain current official checkout/verification/HMAC/refund/settlement contracts, sandbox account access and designated Finance/operations owner. Determine exact environment/account reference handling and callback acknowledgement. No Production credential/settings change.
2. Propose a separate payment-specific staging backend/database/storage and client preview with synthetic identities, independent signing secrets, payments_live=false, Squad sandbox/test keys only, and a sandbox-only network allowlist. Do not reuse or modify the preserved Partner P3B environment: its guard deliberately rejects payment-provider credentials/external traffic. Do not copy Production records or provider secrets. Resource/credential/configuration changes still require separate approval.
3. Implement locally in approved PAY-02 scope: provider-neutral initiation policy; gateway-specific header validation; incoming-provider mode independent of current checkout provider; mandatory evidence; durable attempt/receipt/reference records; concurrency and late-success review; truthful refund/reconciliation interfaces. Preserve default Flutterwave behavior and disabled wallet order/Ride-fare/Partner-fee scopes.
4. Real PostgreSQL tests before provider transactions: identical retry, changed-body same key, concurrent initialization/verify/webhook, two successful providers for one order, simultaneous wallet top-ups, duplicate/different event IDs, missing/wrong signature/header, wrong gateway/reference/account/environment/amount/currency, failed/cancelled/refunded/late success and rollback. Unit mocks are not settlement proof.
5. Only after the separately approved sandbox configuration gate, run bounded Squad sandbox transactions. Exercise success/cancel/decline/timeout/ambiguous response, late and duplicate webhook, verify-first/webhook-first, provider outage and recovery; correlate DB intent, dashboard receipt, immutable references and reconciliation result. No live credentials or charges.
6. Customer order checkout first; wallet top-up is a separate gated scenario because funds affect utilities. Keep general wallet order payment, withdrawals and online Ride fares disabled. Commission remittance and Partner fee migration require their own later approval. Test refund lifecycle/partial failure and statement/settlement reconciliation without mistaking internal status for external success.
7. Android/iOS/web compatibility: external HTTPS checkout, approved host allowlist, no arbitrary provider URL, safe browser cancel/resume, platform app/universal links, website fallback and correct order-versus-wallet route. Native release/OTA or changes to held Customer/Captain submissions require separate authorization; PAY-02 can begin backend/headless and isolated preview testing.
8. Produce a signed-off pass/fail evidence pack and rollback rehearsal; stop before Production. Never credit wallet or fulfil solely from redirect/client success.

## SQUAD_PRODUCTION_CUTOVER_PLAN — future approval required

Deploy compatibility first, separately approved: additive schema plus receiver/verification support for both old Flutterwave attempts and new Squad attempts, with Squad new-initiation OFF. Keep every existing key, webhook URL/secret, Flutterwave return path and current flag value unchanged at this phase. Snapshot safe config/version evidence and back up databases through approved operations.

Require current merchant-account activation/settlement/refund approval and separately approved Squad live secret slots; do not overwrite existing keys or assume the historical SQUAD_LIVE_ACTIVATION_APPROVED flag is sufficient. Verify dashboard receiver setup without replacing the existing Flutterwave receiver. Reconcile opening provider statements against KariGO before first charge.

Use per-purpose/cohort routing, not a blind global switch: bounded new customer order attempts only, record chosen provider/environment/account immutably. Old/held client versions continue supported Flutterwave paths. Wallet top-up/utility ledger, Captain commission and Partner fees stay on their existing paths until separately tested/approved. Leave Cash/POD unchanged and do not activate dormant features.

Finance must set numeric canary limits (count, total value, time window) and owners before approval; PAY-01 invents no spending authority. Expand only after zero unexplained duplicate postings/reference mismatches, matched provider/DB amounts, acceptable error/unknown rates and verified settlement/refund evidence. Monitor pending age, webhook receive-to-process lag, provider outages, duplicate attempts, ledger totals and reconciliation discrepancies. Any unexplained balance/value mismatch stops new Squad initiation and enters Finance review.

## ROLLBACK_PLAN

Stop NEW Squad initiation and route new eligible attempts to the last approved Flutterwave policy. Do not rotate/disable Squad or Flutterwave secrets and do not delete/replace webhook URLs. Keep both verification/webhook/reconciliation handlers and additive schema active for all in-flight/late payments. Verify each existing attempt with its recorded provider; do not silently replay it through Flutterwave or recredit a wallet. Unknown outcomes remain held for reconciliation.

Rollback to a compatibility-capable release, not blindly to today's Flutterwave-only registry: today's Squad mode check would reject late receipts after changing the selector. Retain all provider receipts, audit records, refund obligations and wallet ledger entries. Do not drop/backfill-rewrite financial data as an emergency rollback. Isolate any duplicate external payment for reviewed provider refund; never automatically issue another payment/refund while outcome is uncertain. Reconcile provider statements through final settlement and outstanding refunds before retiring any provider path.

## Stop boundary

Partner remains SOFTWARE_STAGING_READY=YES, P3B_BLOCKED_BY_APPLE_HOLD=YES and APPLE_SUBMISSION_HOLD=YES. Existing staging resources remain preserved. PAY-01 is complete as an audit/plan; no Squad staging credential/configuration change, provider transaction, implementation, Production switch or client release is authorized. Stop for separate approval.
