# Transactional Email Sandbox Test Script

Run only after provider approval, sandbox adapter review, verified sender identity, and
secure staging configuration. Never record credentials, full recipients, personal data,
domain verification records, or unredacted provider screenshots.

## Preconditions

- `MDR-013` is approved and identifies the provider.
- Staging is separate from development and production.
- Sender identity/domain and a masked test recipient are approved.
- Mock rollback is verified before activation.
- Templates and focused email tests pass.

## A. Welcome Email

1. Register a synthetic test customer through the approved staging flow.
2. Trigger the welcome template through an approved test harness/event.
3. Confirm provider acceptance, subject, recipient masking, HTML, and plaintext.
4. Confirm no password, OTP, token, or unnecessary customer data appears.

## B. Order Created Email

1. Create a synthetic customer order.
2. Trigger the order-created template.
3. Confirm the safe order reference and customer display name render correctly.
4. Confirm the approved sender identity and support contact.

## C. Payment Successful Email

1. Complete an approved mock or sandbox payment.
2. Trigger the payment-successful template.
3. Confirm safe order/payment references and server-owned values.
4. Confirm no card, secret, gateway payload, or private payment data appears.

## D. Order Status Update Email

1. Progress an order through a valid vendor/rider transition.
2. Trigger the status template and verify readable status wording.
3. Replay the same upstream event and confirm business idempotency prevents an
   uncontrolled duplicate. Record the current event-deduplication limitation separately.

## E. Support Ticket Email

1. Create a synthetic ticket and trigger its acknowledgement.
2. Add a customer-visible admin response and trigger the update template.
3. Confirm the safe ticket reference; ensure internal notes and private metadata are absent.

## F. Refund Email

1. Submit a controlled refund request and trigger its acknowledgement.
2. Approve through the authorised admin workflow and trigger the approval template.
3. Confirm wording does not promise provider-side funds movement unless confirmed.

## G. Provider Failure

1. Use an approved timeout/failure fixture.
2. Confirm the primary business workflow still succeeds.
3. Confirm logs contain only a sanitized provider error and masked recipient context.
4. Restore `EMAIL_PROVIDER=mock`, restart, and repeat the mock test.

## H. Missing Template Variables

1. Render each template without one required variable in an isolated automated test.
2. Confirm controlled failure before provider invocation.
3. Confirm no unresolved `{{variable}}` placeholder reaches provider output.

## Exit Criteria

- All operational templates render approved HTML and plaintext.
- No sensitive values appear in message bodies, evidence, or normal logs.
- Provider failures remain non-blocking.
- Delivery is not claimed from mock acceptance or provider request acceptance alone.
