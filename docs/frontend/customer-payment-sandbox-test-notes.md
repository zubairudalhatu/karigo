# Customer Payment Sandbox Test Notes

## Current Status

The customer API client accepts `authorizationUrl`, access-code/provider response, and
transaction reference. The current checkout and order-detail UI still assumes mock
payment, immediately verifies, and labels the action as mock. It is **not ready to open
Paystack checkout without a small approved frontend implementation**.

## Required Sandbox Handling

- Preserve current mock flow when backend returns a `mock://` authorization URL.
- For Paystack, open only the backend-returned HTTPS authorization URL using the approved
  external-browser or secure webview approach.
- Show pending while checkout is open; support cancellation, abandonment, timeout, retry,
  success, and failure states.
- Treat callback/deep-link return as navigation only, never proof of payment.
- Call backend verification with the server-generated reference and show success only
  after KariGO confirms it.

## Callback And Deep Links

Choose and security-review an app callback/deep link or browser-return page. Validate
allowed hosts/schemes and re-check authentication/order ownership. If callback support is
unavailable, return the user to the order screen and provide a backend verification
action/polling path.

## Test Cases

Mock success/regression; Paystack authorization open; successful return/verification;
cancel/abandon; provider failure; network loss; app restart; duplicate verification;
expired auth; wrong user/order; and malformed/non-HTTPS authorization URL rejection.

## Limitations And Fallback

No real/sandbox checkout UI is implemented yet. Keep staging on mock until the frontend
handling above is implemented, device-tested, and approved. Mock remains the demo fallback.
