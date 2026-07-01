# Frontend API Integration Map

API base URL: `/api/v1`  
Swagger: `/api/docs`

An endpoint marked **missing** is a planned frontend need that does not yet have a matching backend route.

## Customer App

| Feature | Endpoints |
| --- | --- |
| Registration and login | `POST /auth/customer/register`, `POST /auth/verify-otp`, `POST /auth/login`, `GET /auth/me` |
| Profile and retention | `GET/PATCH /customers/me`, `GET /customers/me/retention-summary` |
| Addresses | `POST/GET /addresses`, `PATCH/DELETE /addresses/:id`, `PATCH /addresses/:id/default` |
| Vendor discovery | `GET /vendors`, `GET /vendors/:id` |
| Product discovery | `GET /vendors/:vendorId/products` |
| Orders and tracking | `POST /orders`, `POST /orders/parcel`, `GET /orders/my-orders`, `GET /orders/:id`, `GET /orders/:id/tracking` |
| Payment and refund | `POST /payments/initiate`, `GET /payments/verify/:reference`, `POST /payments/:id/refund-request` |
| Promotions | `POST /promos/validate` |
| Support | `POST /support/tickets`, `GET /support/tickets/my-tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages` |
| Activity feed | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Ratings | **Missing**; defer until a ratings backend workflow exists. |

## Rider App

| Feature | Endpoints |
| --- | --- |
| Login and identity | `POST /auth/login`, `GET /auth/me`, `GET/PATCH /riders/me` |
| Availability/location | `PATCH /rider/availability`, `PATCH /rider/location` |
| Jobs | `GET /rider/jobs`, `GET /rider/jobs/:orderId`, `POST /rider/jobs/:orderId/accept`, `POST /rider/jobs/:orderId/reject` |
| Delivery flow | `POST /rider/jobs/:orderId/status`, `POST /rider/jobs/:orderId/complete` |
| Earnings | `GET /rider/earnings` |
| Notifications | Standard notification endpoints |
| Support | **Missing rider-specific support route**; current support creation is customer-only. |

## Vendor Dashboard

| Feature | Endpoints |
| --- | --- |
| Login and profile | `POST /auth/login`, `GET /auth/me`, `GET/PATCH /vendors/me` |
| Orders | `GET /vendor-dashboard/orders`, `GET /vendor-dashboard/orders/:id` |
| Order actions | `POST /vendor-dashboard/orders/:id/accept`, `/reject`, `/preparing`, `/ready` |
| Notifications | Standard notification endpoints |
| Product management | **Missing write endpoints**; only public product listing currently exists. |
| Settlements | **Missing vendor-owned settlement endpoint**; admin settlement endpoints exist. |
| Support | **Missing vendor-specific support route**. |

## Admin Portal

| Feature | Endpoints |
| --- | --- |
| Login and identity | `POST /auth/login`, `GET /auth/me` |
| Dashboard and orders | `GET /admin/dashboard`, `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status-note` |
| Dispatch | `GET /admin/riders/available`, `POST /admin/orders/:id/assign-rider`, `POST /admin/orders/:id/reassign-rider` |
| People and merchants | `GET /admin/users`, `GET /admin/vendors`, `GET /admin/riders` |
| Payments/refunds | `POST /admin/payments/:id/approve-refund`; payment listing/detail endpoints are **missing**. |
| Settlements | `/admin/settlements/vendors*`, `/admin/settlements/riders*` |
| Support | `/admin/support/tickets*` |
| Promotions | `/admin/promos*` |
| Reports | `/admin/reports/operations`, `/finance`, `/vendors`, `/riders`, `/promos` |
| Notifications | `GET /admin/notifications` |

## Shared Client Usage

Import `createApiClient` from `@karigo/config` and contracts from `@karigo/shared-types`. Each app supplies its environment URL and token store:

```ts
const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  tokenStore
});
```

Expo apps should later use a SecureStore adapter. Web dashboards should prefer secure, server-managed cookies; local storage is acceptable only for early local prototyping.
