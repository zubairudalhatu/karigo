# Staging WhatsApp Webhook Setup Guide

## Planned Route

`https://staging-api.example.com/api/v1/notifications/whatsapp/webhook`

The route is **not implemented yet**. Do not configure a provider callback until the
public verification handler, raw-body signature validation, idempotent event persistence,
and security review are complete.

## Required Controls

- GET challenge verification using the secret verify token
- POST request signature validation using the app secret and raw request bytes
- Strict payload-size/content-type limits and sanitized errors
- Idempotency using a provider event/message/status identifier
- Supported categories limited to sent, delivered, read, and failed status callbacks
- No inbound free-form customer messaging in the initial sandbox scope
- No raw payload, token, recipient, or message-body logging

## Generic Test Procedure

1. Store the verify token/app secret in the staging secret manager.
2. Configure the HTTPS route in the provider dashboard only after Engineering approval.
3. Test valid and invalid challenge requests.
4. Test a signed status event, duplicate event, and invalid signature.
5. Confirm invalid requests make no state changes and duplicates remain idempotent.
6. Record only masked external evidence identifiers.

Provider-dashboard navigation and exact payload fixtures must be confirmed against the
approved provider documentation during implementation; they are intentionally not guessed
here.

## Troubleshooting And Rollback

Correlate sanitized internal/provider IDs without logging payloads. On failure, disable the
provider webhook, set `WHATSAPP_PROVIDER=mock`, restart/redeploy, and confirm in-app/mock
operation. Revoke temporary credentials if compromise is suspected.
