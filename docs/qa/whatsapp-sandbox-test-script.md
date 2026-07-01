# WhatsApp Sandbox Test Script

Run only after Meta sandbox approval, approved templates/recipients/consent, adapter review,
secure staging, and webhook controls. Never record credentials, raw recipients, confidential
message content, or unredacted screenshots.

## A. Customer Order Created

1. Create a synthetic order and trigger the approved template explicitly.
2. Confirm the provider request uses the approved test recipient and template name.
3. Confirm the safe order reference/wording and independent in-app notification.

## B. Payment Successful

1. Complete mock or approved sandbox payment.
2. Confirm the template contains no payment credential, amount, or gateway payload.
3. Replay verification and confirm upstream idempotency prevents duplicate messaging.

## C. Rider Assigned Customer Update

1. Assign a rider to a test order.
2. Confirm the customer template uses only the order reference.
3. Confirm in-app tracking remains the source of truth.

## D. Vendor New Order

1. Confirm payment server-side.
2. Trigger the vendor template only after payment success.
3. Confirm the order is independently visible in the vendor dashboard.

## E. Rider New Job

1. Assign/reassign an approved test rider.
2. Confirm the role-aware rider template and safe order reference.
3. Confirm the rider app remains the action point.

## F. Support Ticket Update

1. Create a synthetic ticket and add an internal note; confirm no WhatsApp event is sent.
2. Perform an approved customer-visible status update and trigger the template.
3. Confirm only the safe ticket reference is present.

## G. Refund Approved

1. Approve through the authorised admin workflow.
2. Confirm wording does not guarantee provider settlement timing.

## H. Duplicate Event Protection

Replay the same upstream order/payment event. Confirm existing business idempotency and
future outbound-event deduplication evidence; record any duplicate as a blocker.

## I. Webhook Verification

1. Configure the approved staging route after implementation.
2. Verify challenge/token handling and raw-body app-secret signature validation.
3. Send a signed delivery-status fixture twice and confirm idempotency.
4. Confirm invalid token/signature requests are rejected without payload logging.

## J. Provider Failure

1. Use an approved timeout/error fixture.
2. Confirm core workflow status remains successful and in-app activity remains available.
3. Confirm sanitized observability and rollback to `WHATSAPP_PROVIDER=mock`.

## Exit Criteria

- Only approved operational templates/recipients are used.
- Consent, webhook security, idempotency, and rollback pass.
- Provider request acceptance is not mislabeled as recipient delivery.
