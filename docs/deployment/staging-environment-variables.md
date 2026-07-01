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
PAYMENT_PROVIDER=mock
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

Frontend deployment variables:

```dotenv
# Customer and rider Expo apps
EXPO_PUBLIC_API_BASE_URL=

# Vendor dashboard and admin portal
NEXT_PUBLIC_API_BASE_URL=
```

Provider credential placeholders remain empty. See
`services/backend-api/.env.example` for the complete provider-variable inventory.
