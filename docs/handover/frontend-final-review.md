# Frontend Final Review

## Customer App

| Area | Status | Integrated endpoints | Known issues / launch impact |
| --- | --- | --- | --- |
| Auth/profile | Ready for demo | Auth and customer profile/retention endpoints | Real SMS OTP and physical-device testing block customer pilot |
| Addresses | Ready | Address CRUD/default endpoints | No internal-demo blocker |
| Vendor/product browsing | Ready | Public vendor/detail/product endpoints | Real imagery and richer filtering are future work |
| Cart/checkout/mock payment | Ready for demo | Order creation, promo validation, mock payment endpoints | Real payment provider blocks customer pilot |
| Order history/tracking | Ready | Customer order/detail/tracking endpoints | Physical-device network/token-expiry walkthrough required |
| Parcel request | Ready | Parcel order creation and shared payment/tracking | No internal-demo blocker |
| Support/notifications | Ready | Customer support and notification endpoints | External providers deferred |

## Rider App

| Area | Status | Integrated endpoints | Known issues / launch impact |
| --- | --- | --- | --- |
| Auth/availability/profile | Ready for demo | Login/me, availability, location, profile | Physical-device and location behavior testing required |
| Jobs/status/OTP completion | Ready | Rider job list/detail/actions/status/complete | No internal-demo blocker; live GPS excluded |
| Earnings/notifications | Ready | Rider earnings and notification endpoints | Payout remains record-only |
| Rider support | Not Ready | None | Backend rider support routes do not exist; important but not an internal-demo blocker |

## Vendor Dashboard

| Area | Status | Integrated endpoints | Known issues / launch impact |
| --- | --- | --- | --- |
| Auth/dashboard/orders/actions | Ready for demo | Login/me, vendor order list/detail/actions, notifications | Browser-local JWT storage blocks public deployment |
| Profile | Ready | Vendor profile endpoints | No internal-demo blocker |
| Product management | Partially Ready | Public product listing only | Create/edit/availability backend routes missing |
| Settlements/support | Not Ready | Placeholder pages only | Vendor-specific read/support routes missing |

## Admin Portal

| Area | Status | Integrated endpoints | Known issues / launch impact |
| --- | --- | --- | --- |
| Auth/dashboard/orders/dispatch | Ready for demo | Admin dashboard/orders and rider assignment endpoints | Browser-local JWT storage blocks public deployment |
| Users/vendors/riders | Partially Ready | Safe list endpoints | Approval/suspension mutations missing |
| Payments/refunds/settlements | Ready for demo | Refund approval and manual mark-paid endpoints | Real provider/payout integration blocks real financial operations |
| Support/promotions/reports/notifications | Ready for demo | Full implemented admin endpoints | Some metrics are placeholders; advanced filters future work |

## Frontend Decision

All four surfaces are **Ready for an internal demo**. Customer and rider apps are **Not
Ready for a real-customer pilot** until physical-device testing is complete. Vendor and
admin web surfaces are **Not Ready for public deployment** until browser token storage is
replaced with hardened production session handling.
