# KariGO MVP API Testing Checklist

Use Swagger at `http://localhost:4000/api/docs` for request schemas and the Postman collection at `docs/api/KariGO_MVP_API.postman_collection.json` for the core journey.

## Setup

- [ ] PostgreSQL is running and `DATABASE_URL` is valid.
- [ ] `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` complete.
- [ ] Backend starts with `npm run dev:api`.
- [ ] `GET /api/v1/health` returns HTTP 200.
- [ ] Swagger opens at `/api/docs`.
- [ ] Customer, vendor, rider, and admin JWTs are available.

## Core Journey

- [ ] Register customer and capture the development `mockOtp`.
- [ ] Verify OTP and log in.
- [ ] Read and update the authenticated customer profile.
- [ ] Create, list, update, default, and delete an owned address.
- [ ] Confirm another customer cannot access the address.
- [ ] List active vendors and available products.
- [ ] Create a normal order and a parcel order; confirm totals are server-calculated.
- [ ] Initiate and verify a mock payment; confirm duplicate verification is idempotent.
- [ ] Vendor accepts, prepares, and marks an owned order ready.
- [ ] Confirm another vendor cannot access the order.
- [ ] Admin assigns an available rider.
- [ ] Rider accepts, advances valid statuses, and completes with delivery OTP.
- [ ] Confirm another rider cannot access the job.
- [ ] Confirm rider earning and vendor settlement records exist.
- [ ] Create and resolve a support ticket; confirm ownership and internal-note visibility.
- [ ] Validate `KARIGOFIRST`; confirm successful payment is required before usage is counted.
- [ ] List notifications, read one, read all, and verify unread count.
- [ ] Confirm dashboard and reports reflect the completed journey.

## Negative And Security Checks

- [ ] Protected endpoints reject missing or invalid JWTs.
- [ ] Role-restricted endpoints reject the wrong role.
- [ ] Invalid status transitions return the standard error format.
- [ ] Frontend-provided payment, promo, and order totals are not trusted.
- [ ] Duplicate webhook processing does not duplicate payment/order processing.
- [ ] Wrong delivery OTP does not complete an order.
- [ ] Closed support tickets reject customer messages.
- [ ] Notification reads are limited to the notification owner.

## Expected Response Envelopes

Success:

```json
{ "success": true, "message": "Request successful", "data": {} }
```

Error:

```json
{ "success": false, "message": "Error message", "error_code": "ERROR_CODE", "details": {} }
```
