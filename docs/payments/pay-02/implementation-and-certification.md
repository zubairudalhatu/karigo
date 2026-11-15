# PAY-02 implementation and certification record

Status: local implementation prepared; hosted provider certification is pending. This is not approval for PAY-03 or Production deployment.

## Isolation and merchant verification

Before code edits, the signed-in Squad sandbox dashboard identified KariGo Express Limited, sandbox merchant SBV83UFF3L, and displayed a masked test secret and test public key. The test redirect and webhook URL fields were empty. No keys were generated, revealed, rotated or copied into the repository. No dashboard settings or transactions were changed during inspection. The refund interface exists; settlement view showed no settlements/payments and incomplete KYC. Menu availability is not successful merchant API certification.

Official current documentation inspected in the browser:
- https://docs.squadco.com/Payments/Initiate-payment
- https://docs.squadco.com/Payments/verify-transaction/
- https://docs.squadco.com/webhook-direct-url/signature-validation/
- https://docs.squadco.com/webhook-direct-url/webhook-and-direct-url
- https://docs.squadco.com/Others/refund-api/

The canonical sandbox host is sandbox-api-d.squadco.com. Initialization uses minor NGN units and a unique transaction_ref; independent server verification matches transaction_ref, transaction_amount and transaction_currency_id. Squad signs raw webhook bodies with HMAC-SHA512 using its API secret. The documented refund acknowledgment is pending; it is not evidence of a completed refund. No authoritative final-refund lookup was established from these documents. USD is documented by Squad, but PAY-02 order certification is NGN only. Sandbox merchant methods include card, bank transfer, USSD and bank options; this does not certify each rail.

The dedicated launcher permits only its own health/callback, authenticated synthetic operator operations, and the named payment webhook routes. It blocks ordinary customer/login/business routes. A generated operator secret protects fixture creation and inspection. Only synthetic customers/orders are created; there are no funded wallets. Outbound HTTP is restricted to Squad's sandbox API and loopback/the sandbox's own hostname, with fetch redirects disabled. Live provider keys and unrelated credentials fail startup. Database identity and test mode fail closed. Neither Production nor Partner staging is reused.

`infra/payment-sandbox.render.yaml` proposes two new Frankfurt resources, no adoption, no shared env groups, no auto-deploy: one 0.5c-512mb API and one 0.1c-256mb Postgres with private-only database access. Render Blueprint validation passed. The user approved the exact reviewed plan. Dedicated API srv-dbstite7bikc73cf0cqg and private database dpg-dbstig67bikc73cevh0g-a were created; deployment dep-dbstitu7bikc73cf0em0 is live on approved source 8457563820f79cddeb480bce5325b82a223aed5d. Hosted health and access checks passed. No test key is configured yet; private user entry and provider certification remain pending. The billing warning was not altered.

## Local behavior

New order routing is disabled by default and additionally requires isolated staging. Old records are not rewritten. The additive schema stores credential-slot identity, attempt/provider references, state/version, hashed request keys, a minimal webhook inbox, refund states, discrepancy digests and bounded audit fields. Raw provider payloads/card data are not persisted by the new runtime. Historical Payment data remains readable.

Database locks serialize order finalization and customer idempotency keys. A pending/unknown prior attempt blocks a fresh provider intent; a timeout is not treated as proof of no payment. Independent provider verification is required before the existing transactional order finalizer is invoked. Owner, reference, integer minor amount, currency and available merchant identity must match. A paid late/cancelled/duplicate attempt requires reconciliation instead of receiving value. Version checks reject stale state updates. Customer/order/payment side effects run in the same transaction. Legacy order finalizers use the same order lock when this runtime is installed; wallet finalization remains on its existing path.

Webhook ownership is independent of new-checkout selection. A stored attempt remains verifiable/reconcilable after routing is disabled. Invalid provider signatures and wrong endpoint ownership are rejected. Unknown references are preserved without credit. Verification failures leave a durable retry-required event; an authenticated finance retry endpoint re-verifies the original reference. Duplicate processed events do not repeat value.

Refund request, acceptance, pending, failure and uncertainty are separate from confirmed completion. Customer requests update Payment/order/attempt coherently under the order lock. Acknowledgments never mark refunded. The legacy admin approval shortcut cannot mark a tracked attempt refunded. A pending/unknown refund prevents a second provider submission. Authoritative final-refund confirmation remains a certification gate: until an approved Squad status source is established, the implementation intentionally leaves it pending and reconciliation flags it. Flutterwave's existing legacy refund behavior is preserved; its new adapter does not falsely advertise a certified refund capability.

Reconciliation compares provider evidence, attempt, order/payment state, amount/currency/account, duplicate provider references, webhook receipt and refund state. It records discrepancies; it does not silently change financial state.

Customer checkout follows the server's order configuration, retaining the existing Flutterwave fallback when v2 configuration is absent. Initiation has a stable order key and explicitly disables network/temporary automatic POST retries. Double taps are guarded synchronously. A missing checkout URL directs recovery of the original order attempt. Order details display success only when the server actually reports SUCCESSFUL. Wallet and utility UI/routing are not migrated; Ride is untouched. No mobile release or OTA was made.

## Validation evidence

- Clean npm ci: passed.
- Prisma generation: passed.
- Additive migration rehearsal: passed against a fresh synthetic local database. The shipped historical evidence-data migration could not apply seven Production-only records to an empty database; the existing reviewed empty-database DDL-only exception and exact reviewed alignment SQL were reused under a new payment-only guard. No historical production rows were fabricated. Zero schema drift afterward. A subsequent guarded startup also passed migrations/drift on the populated synthetic database.
- First full existing backend suite: 136 passed suites / 1,365 passed tests; 122 environment-gated tests skipped.
- New real PostgreSQL concurrency suite: 16 cases passed with a provider contract double and the real order business finalizer, including one notification/history side effect, cross-order provider-reference duplication, stale results, protected ownership, outage recovery and disabled-routing rollback.
- New provider-isolation contract suite: four cases covering raw signatures, both provider selectors, independent verification, missing evidence, and refund acknowledgments. No real provider network in these tests.
- Sandbox guard: 11 passed controls.
- Local boot/access smoke: ready 200; unauthenticated fixture creation 401; ordinary auth/login route 404; unsigned Squad webhook 401.
- Customer typecheck and complete regression command: passed. Three old source-shape assertions were updated for the intended provider-neutral checkout contract; their surrounding cash/wallet/Flutterwave fallback controls remain.
- Full final backend suite: 138 passed suites / 1,380 passed tests; 122 existing environment-gated tests skipped. Additional payment-target rerun after the final recovery/locking changes: 5 passed suites / 88 passed tests.
- Backend typecheck, Customer typecheck, full Customer regressions and payment-sandbox production compilation: passed. Guard and boot/access smoke reruns passed after source formatting.
- Changed-source credential/diff scan: no findings; no Production config or native/OTA configuration changed.
- Never infer provider certification from mocked/contract tests.

Real Squad success/failure/abandonment/delay/webhook delivery/refund tests have NOT run yet. No real or live provider transaction has occurred. A masked dashboard key is evidence of availability, not validity.

## Required provider certification sequence

The reviewed NEW sandbox resources are applied. Next, the user enters the existing Squad test secret privately into only the new sandbox service (no rotation). Verify the sandbox key/merchant through initialization and server lookup. Set only the sandbox merchant's test redirect/webhook fields to the new service; preserve all live fields. Capture success, failed/abandoned, delayed confirmation and duplicate/verification retries on synthetic NGN100 orders, using official sandbox test instruments only. Persist sanitized HTTP status/state/reference evidence. Deliver a real valid signed webhook and confirm independent lookup/finalization. Test unknown reference/invalid signature/wrong endpoint/amount-currency negatives independently; do not mislabel injected negatives as provider-generated real failures. Submit one idempotent refund only if merchant sandbox supports it; verify its final status through an authoritative merchant/provider source. If unavailable, record that exact gap and keep refund readiness NO.

No new public checkout, no wallet, utility or Ride payment switch, and no real settlement.

## Proposed PAY-03 canary and rollback (NOT executed)

Prerequisites: complete sandbox certification, resolve final refund-status support, approved migration/deployment review and separate PAY-03 approval. Preserve both credential slots and webhook receivers. Start orders only with a named synthetic/internal account allowlist, then a maximum 1% bounded cohort if separately approved. No automatic cross-provider fallback for uncertain intents. Wallet/utilities/Ride remain unchanged. Monitor initialization, verification age, webhook verification and reconciliation per provider/account.

Stop new Squad routing immediately on any duplicate finalization, any amount/currency/account mismatch, any unexplained financial delta, or any invalid ownership transition. Also stop when provider initialization failures exceed 2% over 50 attempts or 3 consecutive attempts, when successful payments remain internally unpaid for 5 minutes, or when signed webhook processing fails for 3 consecutive valid events. Low-volume triggers must not wait for 50 attempts for a critical integrity error.

Rollback disables NEW Squad routing and returns new eligible order checkout to Flutterwave; it does not delete/rewrite attempts, keys or provider identity. In-flight Squad verification/webhooks/reconciliation and pending refunds remain available under their stored provider/account. Never create a Flutterwave intent as fallback for an uncertain Squad attempt. Historical records remain untouched. After rollback, reconcile every in-flight attempt and document all deltas before any renewed rollout.

## Preservation

Read-only Render verification still showed Production dep-dbd8gquq1p3s73cstagg at c907d04b11c1b08cf57c0c82cff604abee07918e and Partner staging dep-dbs1fjlg1s2s73du2ipg at ecc252ae782814f8d109a147d7619383fd4972c6. No Production env/provider/webhook change, live transaction, mobile build, OTA or Apple submission action was made.

The private operator helper in scripts/payment-sandbox-operator.ps1 holds only the generated sandbox operator credential in process memory, accepts commands for the fixed sandbox host and references it created, caps synthetic order creation at eight, and writes sanitized results. It does not accept a merchant/live API key or arbitrary destination. Its PowerShell parser check passed; execution awaits private test-key setup. Browser automation became unavailable after provisioning; no database/network protections were weakened to work around it.

## First actual provider observation

After user-private test-key entry, deployment dep-dbstmdu1egvs73erj1kg became live with credentialConfigured=true. The user saved only the sandbox redirect/webhook fields. The authenticated protected operator made one synthetic NGN100 initialization: it returned UNKNOWN and no checkout URL. Independent lookup of the original reference returned protected HTTP409. No fallback was created and no webhook was recorded. Neither a completed sandbox payment nor absence of a provider-side intent is proven. The next narrow change adds only categorical diagnostic stage/status/reason, excluding all raw messages and payloads, to distinguish this failure safely. The exact observation is in initial-provider-observation.json. Provider certification remains incomplete; no live payment was made.
