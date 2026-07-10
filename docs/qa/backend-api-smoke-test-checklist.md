# Backend API Smoke Test Checklist

Backend base URL:

```text
https://karigo-8htn.onrender.com/api/v1
```

Do not include real passwords, tokens or secrets in this document. Use secure local environment variables or API-client variables when testing protected endpoints.

| Area | Endpoint examples | Expected result | Failure signs | Notes |
|---|---|---|---|---|
| Health | `GET /health` | API returns healthy response. | Timeout, 5xx, no open port. | Render may cold-start. |
| Swagger/API docs | `/api/docs` on backend root if enabled | API docs load or are intentionally hidden. | 404 when expected enabled. | Visibility can differ by environment. |
| Auth login | `POST /auth/login` | Returns access token envelope for valid demo account. | Invalid credentials, wrong token field, CORS failure. | Do not paste password into docs. |
| Auth me | `GET /auth/me` | Returns authenticated user profile for bearer token. | 401 with fresh token, wrong role. | Header: `Authorization: Bearer <token>`. |
| Auth refresh/logout | `POST /auth/refresh`, `POST /auth/logout` if available | Refresh/logout behavior matches frontend expectations. | Stale token preferred, session loop. | Check web portals. |
| Vendor discovery | `GET /vendors` | Active vendors returned. | Empty list after seed. | Food/Grocery/Market vendors expected. |
| Product discovery | `GET /products`, category filters | Products return by category. | Food products under grocery, wrong category. | Use public discovery. |
| Order quote | customer order quote endpoint | Server returns subtotal, delivery fee, discount and payable. | Missing delivery fee, client-only totals. | Protected customer token. |
| Order creation | customer order endpoint | Order created from server quote. | Creates without valid quote. | Mock payment only. |
| Mock payment | payment initiate/verify endpoints | Payment success moves order to paid. | Order paid without backend verification. | No live provider. |
| Vendor applications | `POST /vendor-applications` | Public synthetic application accepted. | Requires auth, CORS block. | Website form depends on this. |
| Vendor payout accounts | vendor/admin payout endpoints | Vendor can submit/read own; admin can verify/reject. | Vendor verifies own account. | No live transfer. |
| Utilities catalogue | `GET /utilities/providers` or configured catalogue route | Demo providers/products load. | Empty catalogue after seed. | Test mode only. |
| Utility quote/create | customer utility quote and transaction endpoints | Test transaction created with safety copy. | Live fulfilment or provider call. | No real airtime/data/token delivered. |
| Taxi waitlist | `POST /taxi/waitlist` | Waitlist entry accepted. | Live booking action. | Public readiness only. |
| Taxi driver application | `POST /taxi/driver-applications` | Driver readiness application accepted. | Driver activated automatically. | Approval readiness-only. |
| Admin Taxi | `/admin/taxi/*` | Admin can review readiness and staging trip data where flags allow. | Public trip booking with flags off. | Taxi dispatch staging-gated. |
| Admin Utilities | `/admin/utilities/*` | Summary/list/detail/manual override work in test mode. | Live fulfilment action. | Admin protected. |
| Support | customer/admin support endpoints | Ticket lifecycle works with customer-visible/internal notes separated. | Internal note visible to customer. | Check notifications. |

Smoke test sequence:

1. Confirm `GET /health`.
2. Confirm API docs visibility.
3. Login as Super Admin, Vendor, Customer and Rider.
4. Call `GET /auth/me` for each token.
5. Load public vendors/products.
6. Run one customer quote/order/mock-payment flow.
7. Confirm vendor sees paid order.
8. Confirm admin dispatch can assign rider.
9. Confirm rider can complete delivery with customer OTP.
10. Confirm support and notifications.
11. Confirm utilities test catalogue and Taxi readiness endpoints.
