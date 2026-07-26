# Task 199 - KariGO Partner App Operations Foundation

## Purpose

Task 199 upgrades the KariGO Partner App from read-only visibility to controlled partner operations for approved Product Sellers, Service Providers and mixed partners.

## Enabled In Partner App

- Go Online / Offline from the mobile dashboard using the existing vendor profile availability field.
- Add products for approved Product Seller and mixed partner accounts.
- Edit product details and product availability.
- Edit partner profile details, including business name, description, contact details, address, city/state, operating hours, logo URL and cover image URL.
- View earnings and settlement records from the existing vendor settlement endpoint.
- Add or update payout account details for KariGO verification.

## Guardrails

- No automated payout execution was added.
- No wallet withdrawal or direct cash-out action was added.
- No live service dispatch was added.
- Service catalogue creation/editing remains controlled through Partner Workspace.
- Product image uploads remain controlled through Partner Workspace; the mobile form accepts approved HTTPS image URLs only.
- Payout account changes are submitted for verification and do not send money.
- Demo/test or closed partner profiles still show a review warning.

## Existing Backend Endpoints Used

- `GET /api/v1/vendors/me`
- `PATCH /api/v1/vendors/me`
- `GET /api/v1/vendor/products`
- `GET /api/v1/vendor/products/:productId`
- `POST /api/v1/vendor/products`
- `PATCH /api/v1/vendor/products/:productId`
- `PATCH /api/v1/vendor/products/:productId/availability`
- `GET /api/v1/vendor/settlements`
- `GET /api/v1/vendor/payout-account`
- `POST /api/v1/vendor/payout-account`
- `PATCH /api/v1/vendor/payout-account`

## Release Impact

- Backend redeploy required: No backend code changed.
- Admin Portal redeploy required: No.
- Vendor Dashboard redeploy required: No.
- Website redeploy required: No.
- Prisma migration required: No.
- Partner EAS Update required: Yes, for the new mobile screens and operations.
- Fresh Partner APK/AAB required: Not required by native dependency changes; recommended only if the current installed binary is not reliably applying OTA updates.
