# Customer Payment Sandbox Test Notes

## Current Status

The customer API client accepts `authorizationUrl`, access-code/provider response, and
transaction reference. Checkout and order detail now preserve the fast mock flow and can
open a backend-returned HTTPS Paystack Test Mode authorization URL in the external
browser.

After the customer completes the provider-hosted test checkout, the app requires a
customer action to verify the payment through KariGO backend. A callback/deep-link return
must not be treated as proof of payment.

## Required Sandbox Handling

- Preserve current mock flow when backend returns a `mock://` authorization URL.
- For Paystack, open only the backend-returned HTTPS authorization URL using the approved
  external-browser approach.
- Show pending while checkout is open; support cancellation, abandonment, retry, success,
  and failure states.
- Treat callback/deep-link return as navigation only, never proof of payment.
- Call backend verification with the server-generated reference and show success only
  after KariGO confirms it.

## Callback And Deep Links

Callback/deep-link support is not required for the first controlled staging test. The
current approved path is manual return plus backend verification. If callback support is
added later, validate allowed hosts/schemes and re-check authentication/order ownership.

## Test Cases

Mock success/regression; Paystack authorization open; successful return/verification;
cancel/abandon; provider failure; network loss; app restart; duplicate verification;
expired auth; wrong user/order; and malformed/non-HTTPS authorization URL rejection.

## Limitations And Fallback

The frontend is ready for controlled Paystack Test Mode verification after the backend is
configured with test-mode credentials through the staging secret manager. Mock remains the
demo fallback and rollback provider.
