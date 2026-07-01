# Staging Payment Webhook Setup Guide

## Endpoint

`POST https://staging-api.example.com/api/v1/payments/webhook/{provider}`

For Paystack preparation, `{provider}` is `paystack`. Replace the example host only in
approved staging configuration.

## Setup

1. Deploy the staging API over HTTPS with raw request-body capture enabled.
2. In the provider's test-mode dashboard, configure the approved staging webhook URL.
3. Store the signing secret/test secret only in the staging secret manager.
4. Restart/redeploy after configuration changes and verify health.
5. Trigger a provider-generated test-mode event; never paste secrets into requests/logs.

Provider dashboard navigation and signing behavior must be confirmed against the current
official provider documentation during approved sandbox execution.

## Verification Tests

- Valid event: signature accepted, reference/amount/currency checked, payment processed once.
- Duplicate event: webhook unique/idempotency guard prevents duplicate effects.
- Invalid signature: request rejected and payment/order unchanged.
- Unknown reference or amount/currency mismatch: rejected without paid transition.

## Logs And Troubleshooting

Use event type, masked reference, timestamp, HTTP status, and internal test ID. Never log
authorization headers, keys, secrets, full raw personal data, or test instrument data.
Check HTTPS reachability, provider test mode, exact route, raw body, signature header,
environment selection, database uniqueness, and server clock.

## Rollback

Set `PAYMENT_PROVIDER=mock`, redeploy/restart, disable the staging provider webhook if
required, run mock payment smoke tests, and record the rollback in the decision log.
