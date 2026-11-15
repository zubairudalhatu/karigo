# PAY-02 implementation and certification record

Status: implemented and exercised in the dedicated hosted sandbox; certification remains incomplete for a real declined payment and authoritative final-refund confirmation. This is not approval for PAY-03 or Production deployment.

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

`infra/payment-sandbox.render.yaml` created exactly two user-approved Frankfurt resources: API srv-dbstite7bikc73cf0cqg and private database dpg-dbstig67bikc73cevh0g-a. Auto-deploy and Blueprint auto-sync remain off. The user privately installed the existing test key and saved only the Squad sandbox redirect/webhook URLs. No key was generated or rotated. The API verified key availability without exposing its value. Render's billing warning was left unchanged.

## Local behavior

New order routing is disabled by default and additionally requires isolated staging. Old records are not rewritten. The additive schema stores credential-slot identity, attempt/provider references, state/version, hashed request keys, a minimal webhook inbox, refund states, discrepancy digests and bounded audit fields. Raw provider payloads/card data are not persisted by the new runtime. Historical Payment data remains readable.

Database locks serialize order finalization and customer idempotency keys. A pending/unknown prior attempt blocks a fresh provider intent; a timeout is not treated as proof of no payment. Independent provider verification is required before the existing transactional order finalizer is invoked. Owner, reference, integer minor amount, currency and available merchant identity must match. A paid late/cancelled/duplicate or already externally refunded attempt requires reconciliation instead of receiving value. Version checks reject stale state updates. Customer/order/payment side effects run in the same transaction. Legacy order finalizers use the same order lock when this runtime is installed; wallet finalization remains on its existing path.

Webhook ownership is independent of new-checkout selection. A stored attempt remains verifiable/reconcilable after routing is disabled. Invalid provider signatures and wrong endpoint ownership are rejected. Unknown references are preserved without credit. Verification failures leave a durable retry-required event; an authenticated finance retry endpoint re-verifies the original reference. Duplicate processed events do not repeat value.

Refund request, acceptance, pending, failure and uncertainty are separate from confirmed completion. Customer requests update Payment/order/attempt coherently under the order lock. Acknowledgments never mark refunded. The legacy admin approval shortcut cannot mark a tracked attempt refunded. A pending/unknown refund prevents a second provider submission. Authoritative final-refund confirmation remains a certification gate: until an approved Squad status source is established, the implementation intentionally leaves it pending and reconciliation flags it. Flutterwave's existing legacy refund behavior is preserved; its new adapter does not falsely advertise a certified refund capability.

Reconciliation compares provider evidence, attempt, order/payment state, amount/currency/account, duplicate provider references, webhook receipt and refund state. It records discrepancies; it does not silently change financial state.

Customer checkout follows the server's order configuration, retaining the existing Flutterwave fallback when v2 configuration is absent. Initiation has a stable order key and explicitly disables network/temporary automatic POST retries. Double taps are guarded synchronously. A missing checkout URL directs recovery of the original order attempt. Order details display success only when the server actually reports SUCCESSFUL. Wallet and utility UI/routing are not migrated; Ride is untouched. No mobile release or OTA was made.

## Validation evidence

- Clean npm ci: passed.
- Prisma generation: passed.
- Additive migration rehearsal: passed against a fresh synthetic local database. The shipped historical evidence-data migration could not apply seven Production-only records to an empty database; the existing reviewed empty-database DDL-only exception and exact reviewed alignment SQL were reused under a new payment-only guard. No historical production rows were fabricated. Zero schema drift afterward. A subsequent guarded startup also passed migrations/drift on the populated synthetic database.
- First full existing backend suite: 136 passed suites / 1,365 passed tests; 122 environment-gated tests skipped.
- New real PostgreSQL concurrency suite: 22 cases passed with a provider contract double and the real order business finalizer, including one notification/history side effect, cross-order provider-reference duplication, stale results, protected ownership, outage recovery and disabled-routing rollback.
- New provider-isolation contract suite: four cases covering raw signatures, both provider selectors, independent verification, missing evidence, and refund acknowledgments. No real provider network in these tests.
- Sandbox guard: 11 passed controls.
- Local boot/access smoke: ready 200; unauthenticated fixture creation 401; ordinary auth/login route 404; unsigned Squad webhook 401.
- Customer typecheck and complete regression command: passed. Three old source-shape assertions were updated for the intended provider-neutral checkout contract; their surrounding cash/wallet/Flutterwave fallback controls remain.
- Final backend suite after all hardening: 139 passed suites / 1,393 passed tests; 122 existing environment-gated tests skipped. The real PostgreSQL orchestration suite passed all 22 cases.
- Backend typecheck, Customer typecheck, full Customer regressions and payment-sandbox production compilation: passed. Guard and boot/access smoke reruns passed after source formatting.
- Changed-source credential/diff scan: no findings; no Production config or native/OTA configuration changed.
- Never infer provider certification from mocked/contract tests.

## Actual hosted provider evidence

Five synthetic NGN100 attempts were created, with no wallet funding or live money:

1. cdd5e30b-3d01-48fa-9409-1a673b842052: initialization UNKNOWN; original lookup HTTP500. Preserve for reconciliation; do not infer no provider intent.
2. bb480d65-6194-4416-ab2b-f7bc56f8738d: initialization UNKNOWN with categorical INIT_EMAIL_REJECTED_HTTP_400. The fixture email was corrected, preserving the synthetic user and both records.
3. 678929cb-29fc-447c-b849-73861b494d7d: actual Squad checkout initialized READY, server lookup PENDING, then simulator success. The real signed charge_successful webhook independently verified and finalized the order before any explicit post-payment client verification. Exactly one finalization, notification and PAID history record. A refund request later returned PENDING, not REFUNDED.
4. a7b102ae-bc7e-4d6f-8182-66a248b476b9: the provider checkout's Declined/Failed simulation nevertheless returned provider success and finalized once. This is NOT a certified failed-payment result. Do not rewrite it to failed based on a UI label.
5. ae0dbacf-efd7-4685-ac51-d6c0c94852a1: checkout modal closed without payment; independent lookup remained PENDING, order AWAITING_PAYMENT, zero finalizations/notifications. Abandonment is not falsely treated as cancellation.

All references above have prefix KGO-ORDER-. Exact sanitized receipts are in hosted-certification.json. No PAN was used; only official sandbox simulator controls and public test PIN/OTP were used. Provider session URLs are not stored in this report.

Two concurrent operator-generated signed replays of the actual successful event were duplicates; four concurrent server verification retries preserved one finalization. Invalid signature and wrong-provider endpoint returned 401. A signed synthetic unknown reference was preserved without credit. Signed amount and currency negative controls did not credit an unpaid order. These operator-generated controls are distinct from actual provider-delivered events.

Eight concurrent hosted runtime requests against one existing attempt (real isolated DB, provider initializer instrumented) reused one logical attempt with zero new initializer calls. This is runtime/DB evidence, not eight additional provider network requests.

Refund 94189d3d-486a-4d9c-a1cf-9ccae7a4173d was accepted PENDING. Replaying its stable idempotency key returned the same record and one refund row. No authoritative final refund completion source was established. REFUND_REVERSAL_READY remains NO. Before any live certification, obtain Squad's merchant-supported final refund status/event contract and a genuine declined-payment sandbox scenario; validate independently under separate approval. No live transaction is authorized here.

Paid-reference reconciliation before the refund reported no discrepancy. A pending refund remains explicitly unresolved; no automatic high-risk correction is made.

## Final hardening

A real PostgreSQL regression reproduced FAILED/CANCELLED reopening on a stale PENDING result. The repair preserves terminal states. Further tests cover positive verification racing with a newer pending result, externally refunded evidence before finalization, avoiding false missing-success-webhook discrepancies on unpaid attempts, and rollback into legacy initiation. Legacy initiation now takes the same order lock and rejects an existing tracked claim, preventing a second provider intent when new v2 routing is disabled. In-flight verification stays available. This does not certify historical untracked uncertain intents; PAY-03 must inventory/reconcile them and limit canary routing to eligible new orders.

## Proposed PAY-03 canary and rollback (NOT executed)

Prerequisites: complete sandbox certification, resolve final refund-status support, approved migration/deployment review and separate PAY-03 approval. Preserve both credential slots and webhook receivers. Start orders only with a named synthetic/internal account allowlist, then a maximum 1% bounded cohort if separately approved. No automatic cross-provider fallback for uncertain intents. Wallet/utilities/Ride remain unchanged. Monitor initialization, verification age, webhook verification and reconciliation per provider/account.

Stop new Squad routing immediately on any duplicate finalization, any amount/currency/account mismatch, any unexplained financial delta, or any invalid ownership transition. Also stop when provider initialization failures exceed 2% over 50 attempts or 3 consecutive attempts, when successful payments remain internally unpaid for 5 minutes, or when signed webhook processing fails for 3 consecutive valid events. Low-volume triggers must not wait for 50 attempts for a critical integrity error.

Rollback disables NEW Squad routing and returns new eligible order checkout to Flutterwave; it does not delete/rewrite attempts, keys or provider identity. In-flight Squad verification/webhooks/reconciliation and pending refunds remain available under their stored provider/account. Never create a Flutterwave intent as fallback for an uncertain Squad attempt. Historical records remain untouched. After rollback, reconcile every in-flight attempt and document all deltas before any renewed rollout.

## Preservation

Read-only Render verification still showed Production dep-dbd8gquq1p3s73cstagg at c907d04b11c1b08cf57c0c82cff604abee07918e and Partner staging dep-dbs1fjlg1s2s73du2ipg at ecc252ae782814f8d109a147d7619383fd4972c6. No Production env/provider/webhook change, live transaction, mobile build, OTA or Apple submission action was made.

The local protected operator was shut down and its in-memory secret disposed after the browser/server shell took over. No credential was written to the repository or artifacts. The server shell used only the sandbox's existing environment in memory; database public access was not enabled.
