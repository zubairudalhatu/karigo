# KariGO MVP QA Checklist

## Backend

- [ ] API starts successfully and database connects.
- [ ] Prisma format, validate, generate, migration, and seed work.
- [ ] `/api/v1` prefix and `/api/v1/health` work.
- [ ] Swagger works at `/api/docs` and shows JWT authentication.
- [ ] DTO validation rejects unknown or invalid fields.
- [ ] Success and error envelopes are consistent.
- [ ] Automated tests, typecheck, and build pass.

## Security

- [ ] JWT is required on protected routes.
- [ ] Customers cannot access another customer's addresses, orders, tickets, or notifications.
- [ ] Vendors cannot access another vendor's orders.
- [ ] Riders cannot access another rider's jobs or earnings.
- [ ] Admin endpoints enforce admin role and supported admin sub-role.
- [ ] Payment, order, and promo amounts are calculated server-side.
- [ ] Webhooks and payment verification are idempotent.
- [ ] Delivery completion requires the correct OTP.
- [ ] Private bank and unnecessary personal data are not exposed.

## Operations

- [ ] Vendor and rider status transitions reject invalid movements.
- [ ] Vendor and rider rejections are recorded with reasons.
- [ ] Refund requests and approvals are controlled and audited.
- [ ] Support tickets preserve internal-note visibility and audit history.
- [ ] Admin status notes and important admin actions create audit logs.
- [ ] Completed delivery creates rider earning and applicable vendor settlement records.
- [ ] Manual payout status changes are audited.
- [ ] Notifications do not break core workflows when an external mock fails.

## Frontend Readiness

- [ ] Customer app routes and request bodies are available in Swagger/Postman.
- [ ] Rider app routes and request bodies are available in Swagger/Postman.
- [ ] Vendor dashboard routes and request bodies are available in Swagger/Postman.
- [ ] Admin portal routes and request bodies are available in Swagger/Postman.
- [ ] Mock data can be replaced with API calls and standard envelopes.
- [ ] Loading, empty, error, authorization, and retry states are defined.

## Launch Readiness

- [ ] Payment, dispatch, support, refund, and payout workflows pass QA.
- [ ] Environment variables and secrets are configured outside source control.
- [ ] Seed data and an admin account are available in non-production environments.
- [ ] End-to-end script is completed with evidence.
- [ ] Known TODOs and launch blockers are documented and owned.
- [ ] Real providers are not enabled before credentials, signatures, retries, and monitoring are validated.
