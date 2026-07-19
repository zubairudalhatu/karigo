# KariGO Backend API

NestJS REST API and Prisma/PostgreSQL database layer for the KariGO MVP.

This phase provides the backend foundation, authentication, ordering, mock payments, vendor/rider workflows, support, admin operations, promotions, retention reporting and an in-app notification activity feed. Real payment gateways, automated payouts, external notification providers, advanced loyalty and real GPS tracking remain deferred.

## Foundation Included

- Global API prefix: `/api/v1`
- Swagger documentation: `/api/docs`
- OpenAPI title/version: `KariGO Backend API` / `1.0.0`
- JWT-enabled Swagger UI with generated DTO schemas and module tags
- PostgreSQL database through Prisma ORM
- Validated environment configuration
- Global DTO validation with unknown-field rejection
- Consistent success and error response formats
- Helmet security headers, compression and restricted CORS
- Graceful shutdown hooks
- Health endpoint: `GET /api/v1/health`
- Phone-first customer registration with configurable mock/Termii-preparation OTP delivery
- Password hashing with bcrypt
- JWT authentication, current-user decorator and role guards
- Customer, vendor and rider profile foundations
- Customer-owned address management with single-default enforcement
- Public active vendor and available-product discovery
- Basic vendor/product and parcel order creation with server-calculated totals
- Provider-based mock payment initiation, verification and webhook processing
- Customer refund requests and admin refund approval placeholders
- Vendor-scoped order listing, acceptance, rejection, preparation and ready-for-pickup workflow
- Admin rider assignment, rider delivery workflow, OTP completion and earning/settlement records
- Customer support tickets, admin support workflow and audited admin operations
- Operational/finance reports and audited vendor/rider payout management
- Promo management, validation, vendor-order discount application and retention summary
- In-app notification activity feed with mock external-channel providers

## Implemented Identity Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/v1/auth/customer/register` | Public |
| POST | `/api/v1/auth/verify-otp` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/auth/me` | Authenticated |
| GET | `/api/v1/customers/me` | Customer |
| PATCH | `/api/v1/customers/me` | Customer |
| GET | `/api/v1/vendors/me` | Vendor |
| PATCH | `/api/v1/vendors/me` | Vendor |
| GET | `/api/v1/riders/me` | Rider |
| PATCH | `/api/v1/riders/me` | Rider |
| POST | `/api/v1/addresses` | Customer |
| GET | `/api/v1/addresses` | Customer |
| PATCH | `/api/v1/addresses/:addressId` | Customer owner |
| DELETE | `/api/v1/addresses/:addressId` | Customer owner |
| PATCH | `/api/v1/addresses/:addressId/default` | Customer owner |
| GET | `/api/v1/vendors` | Public |
| GET | `/api/v1/vendors/:vendorId` | Public |
| GET | `/api/v1/vendors/:vendorId/products` | Public |
| POST | `/api/v1/orders` | Customer |
| POST | `/api/v1/orders/parcel` | Customer |
| GET | `/api/v1/orders/my-orders` | Customer owner |
| GET | `/api/v1/orders/:orderId` | Customer owner |
| GET | `/api/v1/orders/:orderId/tracking` | Customer owner |
| POST | `/api/v1/payments/initiate` | Customer owner |
| GET | `/api/v1/payments/verify/:transactionReference` | Customer owner |
| POST | `/api/v1/payments/webhook/:gateway` | Public gateway webhook |
| POST | `/api/v1/payments/:paymentId/refund-request` | Customer owner |
| POST | `/api/v1/admin/payments/:paymentId/approve-refund` | Admin |
| GET | `/api/v1/vendor-dashboard/orders` | Vendor owner |
| GET | `/api/v1/vendor-dashboard/orders/:orderId` | Vendor owner |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/accept` | Vendor owner |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/reject` | Vendor owner |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/preparing` | Vendor owner |
| POST | `/api/v1/vendor-dashboard/orders/:orderId/ready` | Vendor owner |
| PATCH | `/api/v1/rider/availability` | Rider |
| PATCH | `/api/v1/rider/location` | Rider |
| GET | `/api/v1/admin/riders/available` | Dispatch admin |
| POST | `/api/v1/admin/orders/:orderId/assign-rider` | Dispatch admin |
| POST | `/api/v1/admin/orders/:orderId/reassign-rider` | Dispatch admin |
| GET | `/api/v1/rider/jobs` | Rider owner |
| GET | `/api/v1/rider/jobs/:orderId` | Rider owner |
| POST | `/api/v1/rider/jobs/:orderId/accept` | Rider owner |
| POST | `/api/v1/rider/jobs/:orderId/reject` | Rider owner |
| POST | `/api/v1/rider/jobs/:orderId/status` | Rider owner |
| POST | `/api/v1/rider/jobs/:orderId/complete` | Rider owner |
| GET | `/api/v1/rider/earnings` | Rider owner |
| POST | `/api/v1/support/tickets` | Customer |
| GET | `/api/v1/support/tickets/my-tickets` | Customer owner |
| GET | `/api/v1/support/tickets/:ticketId` | Customer owner |
| POST | `/api/v1/support/tickets/:ticketId/messages` | Customer owner |
| GET | `/api/v1/admin/support/tickets` | Support admin |
| GET | `/api/v1/admin/support/tickets/:ticketId` | Support admin |
| POST | `/api/v1/admin/support/tickets/:ticketId/assign` | Support admin |
| PATCH | `/api/v1/admin/support/tickets/:ticketId/status` | Support admin |
| POST | `/api/v1/admin/support/tickets/:ticketId/messages` | Support admin |
| GET | `/api/v1/admin/dashboard` | Operations admin |
| GET | `/api/v1/admin/orders` | Operations admin |
| GET | `/api/v1/admin/orders/:orderId` | Operations admin |
| PATCH | `/api/v1/admin/orders/:orderId/status-note` | Operations admin |
| GET | `/api/v1/admin/users` | Operations admin |
| GET | `/api/v1/admin/vendors` | Operations admin |
| GET | `/api/v1/admin/riders` | Operations admin |
| GET | `/api/v1/admin/reports/operations` | Operations/report admin |
| GET | `/api/v1/admin/reports/finance` | Operations/report admin |
| GET | `/api/v1/admin/reports/vendors` | Operations/report admin |
| GET | `/api/v1/admin/reports/riders` | Operations/report admin |
| GET | `/api/v1/admin/settlements/vendors` | Finance admin |
| GET | `/api/v1/admin/settlements/vendors/:id` | Finance admin |
| POST | `/api/v1/admin/settlements/vendors/:id/mark-paid` | Finance admin |
| GET | `/api/v1/admin/settlements/riders` | Finance admin |
| GET | `/api/v1/admin/settlements/riders/:id` | Finance admin |
| POST | `/api/v1/admin/settlements/riders/:id/mark-paid` | Finance admin |
| POST | `/api/v1/promos/validate` | Customer |
| POST | `/api/v1/admin/promos` | Marketing admin |
| GET | `/api/v1/admin/promos` | Marketing admin |
| GET | `/api/v1/admin/promos/:id` | Marketing admin |
| PATCH | `/api/v1/admin/promos/:id` | Marketing admin |
| PATCH | `/api/v1/admin/promos/:id/deactivate` | Marketing admin |
| GET | `/api/v1/admin/reports/promos` | Marketing admin |
| GET | `/api/v1/customers/me/retention-summary` | Customer |
| GET | `/api/v1/notifications` | Authenticated user |
| GET | `/api/v1/notifications/unread-count` | Authenticated user |
| PATCH | `/api/v1/notifications/:id/read` | Notification owner |
| PATCH | `/api/v1/notifications/read-all` | Authenticated user |
| GET | `/api/v1/admin/notifications` | Operations/support admin |

When `OTP_PROVIDER=mock` and `APP_ENV` is not `production`, customer registration and resend may return `mockOtp` for local testing. OTP values are stored only as bcrypt hashes. OTPs expire, have a configurable attempt limit, and resend requests enforce a cooldown.

OTP endpoints:

- `POST /api/v1/auth/customer/register`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/resend-otp`

Keep `OTP_PROVIDER=mock` until Termii sandbox preparation is approved. The Termii adapter is blocked in production mode and Africa's Talking remains a placeholder.

Task 33 does not activate Termii. Its staging readiness, blank configuration template,
test script, and rollback record are under `docs/providers/` and `docs/qa/`. Explicit
Termii selection without its required secret and approved sender fails startup; an unset
provider continues to default to mock.

Set `PAYMENT_PROVIDER=mock` for the complete development payment flow. Flutterwave live checkout is gated by explicit Render environment variables and backend verification; Paystack, Monnify and Squad remain sandbox/deferred unless separately approved. See `docs/api/PAYMENT-FOUNDATION.md` for the payment, webhook and refund workflows.

Production provider readiness, required variables, security controls, and phased
implementation plans are documented under `docs/providers/`. Paystack sandbox is the
first implemented real-provider adapter. It supports sandbox initiation, direct
verification, amount/currency checks, and signed webhook parsing, but approved test-account
checkout and refunds remain incomplete. Provider selection is environment-driven. See
`docs/providers/paystack-sandbox-integration.md`. Never commit live credentials; store
them in an approved secret manager.

Vendor orders follow `PAID` or `VENDOR_CONFIRMING` to `VENDOR_ACCEPTED`, `PREPARING` and `READY_FOR_PICKUP`, with a rejection path to `VENDOR_REJECTED`. See `docs/api/VENDOR-ORDER-WORKFLOW.md`.

Dispatch and delivery follow `READY_FOR_PICKUP` through rider assignment, pickup, delivery and OTP completion. See `docs/api/RIDER-DISPATCH-WORKFLOW.md`.

Support tickets, message visibility, admin operations and audit behavior are documented in `docs/api/SUPPORT-ADMIN-OPERATIONS.md`.

Dashboard metrics, reports, payout access control and manual settlement flows are documented in `docs/api/ADMIN-REPORTS-SETTLEMENTS.md`.

Promo validation, checkout application, successful-payment usage tracking and retention metrics are documented in `docs/api/PROMOTIONS-RETENTION.md`.

The in-app activity feed, connected events, provider abstraction and mock-channel behavior are documented in `docs/api/NOTIFICATIONS-ACTIVITY-FEED.md`.

Task 11 QA assets:

- `docs/api/KariGO_MVP_API.postman_collection.json`
- `docs/api/api-testing-checklist.md`
- `docs/qa/mvp-end-to-end-test-script.md`
- `docs/qa/mvp-qa-checklist.md`
- `docs/deployment/developer-handover.md`

## Local Setup

From the monorepo root:

```bash
copy services\backend-api\.env.example services\backend-api\.env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev:api
```

Replace all example secrets before using a shared or production environment.

The API starts at `http://localhost:4000/api/v1`. Swagger is available at `http://localhost:4000/api/docs`.
Swagger exposes JWT bearer authorization; use the **Authorize** button with the access token returned by login.

## Database Commands

Run from `services/backend-api`, or use the corresponding root workspace scripts:

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

An initial Prisma migration is committed. Use `prisma migrate deploy` for controlled production deployment; use `prisma migrate dev` only for local development.
The idempotent development seed creates vendor categories, an active sample vendor, sample products, a customer address and a sample parcel order.

## Verification

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e:smoke
```

The smoke test requires a migrated, seeded local database and a running API. It exercises the complete mock-provider food/parcel workflows and high-risk access controls.

## Deployment Readiness

Production and soft-launch preparation lives in:

- `docs/deployment/production-environment-checklist.md`
- `docs/deployment/deployment-runbook.md`
- `docs/deployment/production-todo-register.md`
- `docs/launch/`
- `docs/qa/e2e-test-results.md`
- `docs/qa/known-issues.md`
- `docs/handover/backend-final-review.md`
- `docs/handover/launch-blocker-audit.md`
- `docs/handover/handover-package-index.md`

Rate limiting, environment-controlled Swagger visibility, real external providers, and production-grade web session handling remain required before public launch.
The backend is ready for an internal demo with mock providers, but it is not approved for
real-customer financial or messaging traffic. Never commit live secrets or production
credentials.

Transactional email is mock-only. Provider adapters and branded templates live under
`src/modules/notifications/email/`; see `docs/providers/email-provider-integration-plan.md`
and `docs/providers/email-template-catalogue.md`. Keep `EMAIL_PROVIDER=mock` until an
approved sandbox provider is implemented and reviewed.

Task 34 confirms every email template renders in HTML and plaintext, with escaped
variables and recipient-masked mock logs. SMTP, SendGrid, Mailgun, and SES remain
fail-closed until `MDR-013`, a selected sandbox adapter, verified sender/domain, secure
credentials, and deployed staging are available.

WhatsApp operational notifications are also mock-only. Provider code and draft templates
live under `src/modules/notifications/whatsapp/`. Review
`docs/providers/whatsapp-provider-integration-plan.md`,
`docs/providers/whatsapp-template-catalogue.md`, and
`docs/providers/whatsapp-consent-and-compliance-notes.md` before any sandbox work.
Never send marketing messages without explicit consent and approved controls.

Task 36 enforces an operational-template allowlist, disables unrestricted text messages,
adds role-aware vendor/rider templates, and verifies masked mock logging. Meta Cloud and
webhooks remain fail-closed pending `MDR-015`, consent controls, approved templates/test
recipients, credentials, adapter review, and deployed staging.

Paystack sandbox activation remains opt-in and staging-only. Keep
`PAYMENT_PROVIDER=mock` unless formal approval, secure test credentials, a separate
staging deployment, webhook/callback configuration, and the payment sandbox test script
are complete. Explicit Paystack selection without a valid test secret fails startup;
KariGO does not silently downgrade a misconfigured Paystack deployment.

Push notifications are mock-only. Provider code and operational templates live under
`src/modules/notifications/push/`. Authenticated users can register, list, and deactivate
their own device tokens through `/api/v1/notifications/device-tokens`; raw token values
are never returned. Review `docs/providers/push-notification-integration-plan.md`,
`docs/providers/push-template-catalogue.md`, and
`docs/frontend/mobile-push-notification-readiness.md` before enabling an Expo or Firebase
sandbox. Keep `PUSH_PROVIDER=mock` and never commit provider credentials.

Task 35 binds registration to authenticated roles/app surfaces, validates Expo token
shape, omits raw tokens/device IDs from responses, and verifies masked mock logging.
Expo/Firebase remain fail-closed pending `MDR-014`, adapter review, credentials, approved
mobile builds/devices, and deployed staging.

## Response Format

Successful responses:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

Errors:

```json
{
  "success": false,
  "message": "Error message",
  "error_code": "ERROR_CODE",
  "details": {}
}
```

## Current Structure

```text
src/
├── common/
│   ├── filters/
│   ├── interceptors/
│   └── interfaces/
├── config/
├── domain/
├── modules/
│   ├── auth/
│   ├── addresses/
│   ├── customers/
│   ├── health/
│   ├── orders/
│   ├── payments/
│   ├── products/
│   ├── riders/
│   ├── users/
│   └── vendors/
├── prisma/
├── security/
├── app.module.ts
└── main.ts
```
