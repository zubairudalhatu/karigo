# Customer App API Integration

## Overview

The Expo customer app now uses `EXPO_PUBLIC_API_BASE_URL`, the shared KariGO API client, shared contracts, and Expo SecureStore for JWT persistence. Protected screens redirect to customer login, and HTTP 401 responses clear the stored session.

## Integrated Endpoints And Screens

| Flow | Screens | Endpoints |
| --- | --- | --- |
| Auth | signup, OTP verification, login, session bootstrap/logout | `/auth/customer/register`, `/auth/verify-otp`, `/auth/login`, `/auth/me` |
| Profile | profile and retention summary | `GET/PATCH /customers/me`, `GET /customers/me/retention-summary` |
| Addresses | list, add, edit, delete, set default | `/addresses*` |
| Discovery | home vendor list/search, vendor details, product details | `GET /vendors*`, `GET /vendors/:id/products` |
| Cart/checkout | local single-vendor cart, address selection, order creation | `POST /orders` |
| Parcel | parcel request form | `POST /orders/parcel` |
| Orders | history, detail, tracking activity | `GET /orders/my-orders`, `GET /orders/:id`, `GET /orders/:id/tracking` |
| Payment | mock initiation and verification from checkout/order detail | `POST /payments/initiate`, `GET /payments/verify/:reference` |
| Promo | checkout validation using `KARIGOFIRST` | `POST /promos/validate` |
| Support | create/list/detail/reply | `/support/tickets*` |
| Activity feed | list, unread count, read one/all | `/notifications*` |

## Key Rules

- JWT is stored with Expo SecureStore and sent only through the configured KariGO API client.
- The app accepts only `CUSTOMER` sessions.
- Checkout requires an owned delivery address.
- The cart supports one vendor at a time and blocks unavailable products.
- Order and payment totals displayed after creation come from the backend.
- Promo validation is informative; applying the promo occurs through server-side order creation.
- Mock payment uses the server-returned order total and transaction reference.
- Support ticket responses exclude internal admin notes through the customer endpoint.

## Run And Test

```powershell
Copy-Item apps/customer-app/.env.example apps/customer-app/.env
npm install
npm run typecheck --workspace @karigo/customer-app
npm run start --workspace @karigo/customer-app
```

For a physical phone, replace `localhost` with the development machine's LAN IP. Start PostgreSQL, apply migrations/seed, and run the backend before testing.

Recommended manual sequence:

1. Register and verify the mock OTP.
2. Log in and add an address.
3. Browse a vendor and add products.
4. Validate `KARIGOFIRST`, create an order, and verify mock payment.
5. Open order tracking, create a support ticket, and inspect notifications.

## Known TODOs

- Add polished bottom-tab navigation and reusable form validation.
- Persist cart state across app restarts.
- Add pull-to-refresh, pagination, optimistic updates, and richer offline behavior.
- Add native confirmation dialogs before destructive actions.
- Add automated component/integration tests and EAS build configuration.
- Ratings and grocery-market custom request flows remain unavailable because matching backend workflows do not exist.
- Real payment and external notification providers remain intentionally deferred.
