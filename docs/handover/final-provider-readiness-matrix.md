# Final Provider Readiness Matrix

Status reflects repository evidence as of June 14, 2026. `Ready` means suitable for the
current mock-provider internal demo, not automatically approved for production.

| Area/provider | Current status | Required credentials / variables | Sandbox readiness | Live readiness | Security requirements and remaining TODOs | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Mock payment | Ready | `PAYMENT_PROVIDER=mock` | Ready | Never use live | Development/test only; preserve idempotency tests | Keep for demo |
| Paystack | Partially Ready | test secret/public keys, webhook secret, base/callback URLs | Backend adapter ready; approved-account E2E and frontend redirect pending | Not ready | Verify signed raw-body webhooks, server amount/currency, refunds, reconciliation, monitoring, key custody | P0 |
| Flutterwave | Placeholder | secret/public/webhook keys | Not ready | Not ready | Implement adapter, verification, signed webhooks, refunds | P3 |
| Monnify | Placeholder | API/secret keys, contract code, webhook secret | Not ready | Not ready | Implement full adapter and reconciliation | P3 |
| Squad | Placeholder | secret/public/webhook keys | Not ready | Not ready | Implement full adapter and reconciliation | P3 |
| Mock OTP/SMS | Ready | `OTP_PROVIDER=mock`, `SMS_PROVIDER=mock` | Ready | Never use live | Mock OTP only outside production | Keep for demo |
| Termii | Partially Ready | API key, sender ID, base URL | Preparation adapter exists; approved-account test pending | Not ready | Distributed rate limits, sender approval, delivery telemetry, production guard removal after sign-off | P0 |
| Africa's Talking | Placeholder | username, API key, sender ID | Not ready | Not ready | Implement provider call, delivery status, retries | P2 |
| Mock email | Ready | `EMAIL_PROVIDER=mock` | Ready | Never use live | Log safely; do not block workflows | Keep for demo |
| SMTP | Placeholder | host, port, username, password, secure mode | Not ready | Not ready | TLS, sender reputation, bounce handling | P2 |
| SendGrid | Placeholder | API key, verified sender/domain | Not ready | Not ready | SPF/DKIM/DMARC, event webhooks, suppression | P1 |
| Mailgun | Placeholder | API key, domain | Not ready | Not ready | Domain verification, event webhooks, suppression | P2 |
| Amazon SES | Placeholder | region and managed credentials | Not ready | Not ready | IAM least privilege, production-access approval, bounce/complaint handling | P2 |
| Mock WhatsApp | Ready | `WHATSAPP_PROVIDER=mock` | Ready | Never use live | Operational templates only; no marketing | Keep for demo |
| Meta WhatsApp Cloud | Placeholder | access token, phone/business IDs, verify token | Not ready | Not ready | Consent records, approved templates, signature verification, opt-out, delivery telemetry | P3 |
| Mock push | Ready | `PUSH_PROVIDER=mock` | Ready | Never use live | Mask tokens; do not block workflows | Keep for demo |
| Expo push | Placeholder | Expo access token | Device-token backend ready; physical-device delivery pending | Not ready | Permission UX, token refresh/logout cleanup, invalid-token receipts, payload review | P1 |
| Firebase push | Placeholder | project ID, client email, private key/server configuration | Not ready | Not ready | IAM, APNs setup, token lifecycle, receipt/error handling | P2 |

## Decision

Use Paystack as the first payment provider, Termii as the first OTP provider, SendGrid
or Amazon SES for transactional email after domain setup, and Expo Push for the first
mobile push pilot. Keep WhatsApp deferred until consent and template governance exist.
