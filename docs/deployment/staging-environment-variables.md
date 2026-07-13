# Staging Environment Variables

Replace examples only in the deployment platform's secret/environment settings. Do not
commit real secrets. Keep live provider keys out of staging until separately approved.

```dotenv
APP_NAME=KariGO
APP_ENV=staging
APP_PORT=4000
APP_URL=
API_PREFIX=/api/v1
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGINS=

OTP_PROVIDER=mock
SMS_PROVIDER=mock
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
NOTIFICATION_PROVIDER=mock
EMAIL_PROVIDER=mock
WHATSAPP_PROVIDER=mock
PUSH_PROVIDER=mock

SUPER_ADMIN_NAME=KariGO Staging Super Admin
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PHONE=
SUPER_ADMIN_PASSWORD=
SEED_DEMO_PASSWORD=
```

Optional Paystack Test Mode variables for controlled checkout verification only:

```dotenv
PAYSTACK_MODE=test
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_BASE_URL=
PAYSTACK_CALLBACK_URL=
```

Store all Paystack values only in the staging secret manager. Do not commit credentials,
test instruments or provider dashboard screenshots. Roll back by setting
`PAYMENTS_PROVIDER=mock` and `PAYMENT_PROVIDER=mock`, then redeploying the backend.

Frontend deployment variables:

```dotenv
# Customer and rider Expo apps
EXPO_PUBLIC_API_BASE_URL=

# Vendor dashboard and admin portal
NEXT_PUBLIC_API_BASE_URL=
```

Provider credential placeholders remain empty. See
`services/backend-api/.env.example` for the complete provider-variable inventory.
