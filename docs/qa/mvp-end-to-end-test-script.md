# KariGO MVP End-to-End Test Script

## Preconditions

1. Run PostgreSQL, migrations, seed, and the backend.
2. Open Swagger at `http://localhost:4000/api/docs`.
3. Prepare customer, vendor, rider, operations admin, support admin, and finance admin credentials.
4. Record IDs and JWTs in a temporary test worksheet. Never commit real secrets.

## Scenario A: Customer Food Or Grocery Order

| Step | Action | Expected Result |
| --- | --- | --- |
| 1 | Register a customer | Customer and mock OTP are returned in development. |
| 2 | Verify OTP, then log in | JWT is issued; `/auth/me` returns the customer. |
| 3 | Add a delivery address | Address belongs to customer and becomes default when requested. |
| 4 | Browse vendors and products | Only active vendors and available products appear. |
| 5 | Create vendor order | Items, subtotal, delivery fee, total, and history are stored server-side; status is `AWAITING_PAYMENT`. |
| 6 | Initiate and verify mock payment | Payment becomes successful; order becomes `PAID`; vendor receives activity. |
| 7 | Vendor accepts, prepares, and marks ready | Status advances only through valid vendor transitions. |
| 8 | Admin assigns an online approved rider | Order becomes `RIDER_ASSIGNED`; rider receives activity. |
| 9 | Rider accepts and advances delivery statuses | History records arriving, picked up, on the way, arrival, and delivery. |
| 10 | Rider completes using delivery OTP | Order becomes `COMPLETED`; wrong OTP is rejected. |
| 11 | Inspect post-completion records | Customer notification, rider earning, vendor settlement, dashboard, and reports update. |

## Scenario B: Parcel Delivery Order

1. Customer creates a parcel request and confirms server-calculated totals.
2. Customer initiates and verifies mock payment.
3. Move the parcel to the dispatch-ready state according to the current admin workflow.
4. Admin assigns an available rider.
5. Rider accepts, picks up, transports, arrives, and marks delivered.
6. Rider completes with delivery OTP.
7. Confirm status history, activity feed, earning, settlement applicability, and reports.

## Scenario C: Support And Refund Issue

1. Customer creates an order-linked support ticket.
2. Confirm another customer cannot read it.
3. Support admin assigns the ticket and adds an internal note.
4. Confirm the customer cannot see the internal note.
5. Admin changes status to `WAITING_FOR_CUSTOMER`; customer replies; confirm return to `IN_REVIEW`.
6. Admin resolves and closes the ticket.
7. For a refund issue, use the payment refund-request and admin approval endpoints.
8. Confirm refund history, support audit records, payment/order status, and notifications.

## Scenario D: Promo Usage

1. Admin creates or uses the seeded `KARIGOFIRST` promo.
2. Customer validates it against an eligible order subtotal.
3. Apply it during supported order checkout and confirm server recalculation.
4. Confirm failed or abandoned payment does not create usage.
5. Verify successful payment and confirm exactly one usage record.
6. Confirm retention summary and promo report update.

## Completion Evidence

- Save request/response evidence without secrets.
- Record tester, date, environment, build/commit, failures, and retest results.
- Block release for authorization failures, incorrect totals, invalid status movement, duplicate financial processing, or OTP bypass.
