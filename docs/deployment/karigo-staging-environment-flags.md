# KariGO Staging Environment Flags

Use these values as staging defaults unless management explicitly approves a controlled test.

## Backend

```text
APP_ENV=staging
TAXI_SERVICE_ENABLED=false
TAXI_STAGING_DISPATCH_ENABLED=false
PHARMACY_MARKETPLACE_ENABLED=false
PAYMENTS_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENTS_LIVE_ENABLED=false
OTP_PROVIDER=mock
SMS_PROVIDER=mock
EMAIL_PROVIDER=mock
WHATSAPP_PROVIDER=mock
PUSH_PROVIDER=mock
NOTIFICATION_PROVIDER=mock
```

Paystack Test Mode may be enabled only for a controlled staging checkout test:

```text
PAYSTACK_MODE=test
PAYMENTS_PROVIDER=paystack
PAYMENT_PROVIDER=paystack
PAYMENTS_LIVE_ENABLED=false
```

Never set `PAYMENTS_LIVE_ENABLED=true` in staging or commit Paystack credentials to Git.

Provider separation:

- Paystack is for customer checkout/payment collection.
- Accelerate.ng is the intended future service provider for airtime, data, electricity,
  cable TV and other utility payments.
- Termii is the intended future SMS provider for OTP, order updates, Delivery Captain
  notifications, utility alerts, wallet/refund alerts and referral notifications.

Paystack Test Mode, Accelerate utility services, and Termii SMS are integration-ready
concepts only. Live payment collection, live utility fulfilment, wallet refund automation,
SMS sending and payout automation remain disabled until separately approved.

Taxi staging dispatch may be enabled only in staging for controlled tests:

```text
TAXI_SERVICE_ENABLED=true
TAXI_STAGING_DISPATCH_ENABLED=true
```

Never enable `TAXI_STAGING_DISPATCH_ENABLED=true` in production.

## Mobile Apps

Customer App and Rider App staging defaults:

```text
EXPO_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1
EXPO_PUBLIC_TAXI_SERVICE_ENABLED=false
EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED=false
EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED=false
```

If Taxi Test Mode is approved in staging, both backend and mobile flags must be enabled before rebuilding or publishing an EAS update.

## Website

```text
NEXT_PUBLIC_API_BASE_URL=https://karigo-8htn.onrender.com/api/v1
NEXT_PUBLIC_SITE_URL=https://www.karigo.com.ng
```

Website Taxi remains coming soon/readiness unless explicitly approved for a private staging route. Do not show public live Taxi booking.

## CORS Allowed Origins

Backend `CORS_ORIGINS` should include approved staging/public web origins:

```text
https://www.karigo.com.ng
https://karigo.com.ng
https://admin.karigo.com.ng
https://vendor.karigo.com.ng
https://karigo-admin-portal.vercel.app
https://karigo-vendor-dashboard.vercel.app
```

Also include the active website Vercel fallback domain once confirmed in the Vercel dashboard.

## Credential Rules

- Store secrets only in Render, Vercel, EAS or approved secret manager.
- Do not commit `.env` files.
- Keep `.env.example` placeholders blank unless a value is explicitly public and safe.
- Do not record demo passwords in Git.
- Turn off one-time seed reset flags immediately after use.
