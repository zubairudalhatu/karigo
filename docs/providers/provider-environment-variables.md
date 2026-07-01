# Provider Environment Variables

Store real values in an approved secret manager. Never commit `.env` files or live keys.
Public keys may be frontend-visible only where the chosen provider explicitly requires
them; secret keys always remain backend-only.

## Payment

| Variable | Purpose |
| --- | --- |
| `PAYMENT_PROVIDER` | `mock`, `paystack`, `flutterwave`, `monnify`, or `squad` |
| `PAYSTACK_SECRET_KEY` | Backend Paystack credential |
| `PAYSTACK_PUBLIC_KEY` | Approved client/public Paystack credential |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook signature secret/configuration |
| `FLUTTERWAVE_SECRET_KEY` | Backend Flutterwave credential |
| `FLUTTERWAVE_PUBLIC_KEY` | Approved client/public Flutterwave credential |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Flutterwave webhook signature/hash |
| `MONNIFY_API_KEY` | Monnify API key |
| `MONNIFY_SECRET_KEY` | Monnify secret key |
| `MONNIFY_CONTRACT_CODE` | Monnify contract identifier |
| `MONNIFY_WEBHOOK_SECRET` | Monnify webhook signing secret |
| `SQUAD_SECRET_KEY` | Backend Squad credential |
| `SQUAD_PUBLIC_KEY` | Approved client/public Squad credential |
| `SQUAD_WEBHOOK_SECRET` | Squad webhook signing secret |

## SMS And OTP

| Variable | Purpose |
| --- | --- |
| `OTP_PROVIDER` | Active OTP adapter: `mock`, `termii`, or `africas_talking` |
| `OTP_EXPIRY_MINUTES` | OTP validity window |
| `OTP_LENGTH` | Generated numeric OTP length |
| `OTP_MAX_ATTEMPTS` | Maximum verification attempts |
| `OTP_RESEND_COOLDOWN_SECONDS` | Minimum delay between OTP sends |
| `SMS_PROVIDER` | General SMS adapter placeholder; currently defaults to mock |
| `SMS_API_KEY`, `SMS_SENDER_ID` | Generic future SMS settings |
| `TERMII_API_KEY`, `TERMII_SENDER_ID`, `TERMII_BASE_URL` | Termii preparation settings |
| `AFRICAS_TALKING_USERNAME`, `AFRICAS_TALKING_API_KEY`, `AFRICAS_TALKING_SENDER_ID` | Africa's Talking placeholder settings |

The current Termii adapter is restricted to non-production sandbox preparation. Never
store live credentials in repository files.

## Email

`EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_SECURE`, `SENDGRID_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`,
`AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`.

Email remains mock-only until sandbox testing is approved.

## WhatsApp

`WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_BASE_URL`,
`WHATSAPP_API_VERSION`.

WhatsApp remains mock-only until sandbox testing, consent controls, and template approval
are complete.

## Push

`PUSH_PROVIDER`, `EXPO_ACCESS_TOKEN`, `FCM_SERVER_KEY`, `FCM_PROJECT_ID`,
`FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`.

Push remains mock-only until mobile permissions, token lifecycle handling, and sandbox
delivery/receipt processing are approved.

## Shared Webhook Security

`WEBHOOK_SIGNING_SECRET` and `INTERNAL_WEBHOOK_TOKEN` may be used only for KariGO-owned
internal integrations. Provider webhooks must use the provider's documented signature
mechanism and must not rely solely on a shared internal token.

## Validation Policy

When a non-mock provider is selected, startup validation must require that provider's
credentials and reject placeholder/example values. Production must also reject all mock
provider selections.
