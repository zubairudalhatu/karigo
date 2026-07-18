# Passwordless and Marketing Readiness - Task 165

Task 165 wires safe launch controls for passwordless readiness, marketing and bulk messaging visibility.

## Passwordless / Biometric

Backend Developer Settings reads:

```text
PASSWORDLESS_LOGIN_ENABLED
```

If the flag is not set, passwordless login remains disabled.

Biometric login should be activated only in a future app task that uses secure token storage, never stores passwords, and keeps normal login as fallback. A fresh Customer/Captain app build may be required if native biometric dependencies are added later.

## Marketing and Bulk Messaging

Backend Developer Settings reads:

```text
MARKETING_ENABLED
BULK_MESSAGING_ENABLED
```

These are readiness flags only. Task 165 does not send marketing, bulk SMS, bulk email, push campaigns, newsletters, WhatsApp blasts or promotional messages.

Future campaign sending must require:

- approved opt-in/opt-out handling;
- admin confirmation;
- privacy review;
- rate limits and provider review;
- no committed contact lists or secrets.

## Launch Guardrail

KariGO remains launch-scoped to Kano and Abuja for Cash/POD and wallet checkout readiness. Nationwide availability must not be claimed until separately approved.
