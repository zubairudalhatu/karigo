# Admin Portal Role Test Checklist

Use Super Admin or Operations Admin from `docs/deployment/karigo-staging-demo-accounts.md`.

| Area | Steps | Expected result | Failure signs | Tester notes |
|---|---|---|---|---|
| Login | Open Admin Portal and sign in. | Admin dashboard opens for admin roles only. | Non-admin access, session expired loop. | Test fallback Vercel and custom domain if available. |
| Dashboard | Review metrics. | Orders, GMV, delivery fee and support activity load. | API error, wrong totals. | Seed data may make some metrics low. |
| Orders | Open order list/detail. | Order status, payment status, items and financials visible. | Missing order history or raw errors. | Do not expose customer secrets. |
| Dispatch | Assign available rider to ready order. | Assignment succeeds and rider sees job. | Wrong rider list, duplicate assignment. | Reassignment requires confirmation. |
| Users/customers | Open users/customers pages. | Lists load and role data is readable. | Admin sees raw password/token data. | No password hashes in UI. |
| Vendors | Open vendor management. | Vendors load with category/location/status. | Vendor data missing or wrong. | Check Food/Grocery/Market. |
| Vendor applications | Review applications. | Application list/detail and review workflow work. | Applicant notes mixed with internal notes. | Internal notes hidden from applicant. |
| SME Services | Open SME Services, filter requests, view detail, update review status and record manual provider assignment. | Requests load with customer/location details; status update and manual assignment require confirmation and record admin history. | Live provider dispatch, payment, payout, provider login or medical booking action appears. | Manual assignment is operations recordkeeping only. |
| SME providers | Open SME Providers, create/update a provider record and filter by status/type/city. | Provider directory loads; approved matching providers are selectable for SME request assignment. | Provider phone is shown to Customer App, provider login exists, or health professional provider can be approved/assigned. | Admin-only directory; no customer-facing provider contact exposure. |
| Payout accounts | Review pending/verified/rejected/needs update. | Admin can verify/reject with confirmation; vendor cannot. | Transfer funds button or missing confirmation. | No live payout provider. |
| Riders | Open riders and available riders. | Rider status and availability are accurate. | Inactive riders assignable unexpectedly. | Coordinate Rider app test. |
| Settlements | Mark vendor settlement/rider earning paid. | Confirmation appears; status and notifications update. | Real bank transfer triggered. | Mark-paid is recordkeeping only. |
| Support | Open tickets, respond, resolve. | Customer-visible/internal notes behave correctly. | Internal note sent to customer. | Confirm Customer App refresh. |
| Utilities | Open utility summary/transactions. | Test-mode warning, transaction list/detail and manual staging override available. | Live fulfilment wording, real token claim. | No real provider enabled. |
| Taxi | Open Taxi page. | Driver Applications, Customer Waitlist, Driver Profiles, Test Taxi Trips and Taxi Summary tabs visible. | Live taxi booking/payment/SOS shown. | Dispatch remains feature-gated. |
| Reports | Open reports. | Operations/finance/vendor/rider/promo reports load. | Crash due to no live data. | Some zero metrics are acceptable. |
| Promotions | Create/deactivate staging promo if needed. | Confirmation and status update work. | Promo abuse controls missing. | Do not break `KARIGOFIRST`. |
| Notifications | Open notifications. | Admin notifications readable. | Sensitive OTP/token info. | Check timestamp formatting. |
| Audit-sensitive actions | Perform refund approval, settlement mark-paid, rider reassignment, promo deactivation. | Confirmation is required. | One-click destructive action. | Record action owner/time. |
| Logout | Logout. | Session clears and protected pages redirect. | Stale token still works. | Retest login. |

Taxi-specific confirmations:

- Taxi dispatch remains disabled unless backend flags are enabled in staging.
- No real Taxi payment exists.
- No live maps billing or geolocation provider exists.
- No SOS/emergency provider exists.

Utilities-specific confirmations:

- Utility summary and transaction detail load.
- Manual override is staging-only.
- UI says no real airtime, data, electricity token or cable subscription is delivered.

SME Services-specific confirmations:

- SME Services list and detail pages load for approved admin roles.
- Admin can filter by request status and service provider type.
- Admin can update review status with an internal note.
- Admin can create and update admin-only SME provider records.
- Admin can manually assign only approved matching providers to active requests.
- Health professional providers remain readiness-only and cannot be approved or assigned.
- Customer-facing SME Services endpoints do not expose provider phone numbers or email addresses.
- No live provider dispatch, service payment, provider payout, provider app login or regulated medical booking is exposed.
