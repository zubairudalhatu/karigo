# Production Environment Checklist

Use this checklist for a controlled deployment review. Unchecked items are not implied to be complete.

## Backend

- [ ] Set the production API URL and `APP_URL`.
- [ ] Set `APP_ENV=production`, `APP_PORT`, and `API_PREFIX=/api/v1`.
- [ ] Set a unique production `DATABASE_URL`.
- [ ] Generate a strong, unique `JWT_SECRET`; never reuse development values.
- [ ] Restrict `CORS_ORIGINS` to approved HTTPS dashboard domains.
- [ ] Add and verify production rate limiting. This is not implemented yet.
- [x] Helmet security headers, compression, DTO validation, consistent errors, and role guards are enabled.
- [ ] Configure structured logging, retention, redaction, and alerting.
- [ ] Decide whether Swagger remains available publicly. It is currently always exposed at `/api/docs`.
- [ ] Keep `/api/v1/health` available to the hosting health checker.
- [ ] Validate every environment variable before accepting traffic.
- [ ] Define production admin provisioning. Never use the development seed password.

## Database

- [ ] Provision managed production PostgreSQL with encrypted connections.
- [ ] Run committed Prisma migrations through a controlled release job.
- [ ] Take a verified backup before every migration.
- [ ] Document and rehearse point-in-time restore.
- [ ] Configure connection limits/pooling for API scale.
- [ ] Review migration SQL before deployment.
- [ ] Define rollback: restore backup or deploy a reviewed forward-fix migration.
- [ ] Never run the development seed against production.

## Frontends

- [ ] Set customer and rider `EXPO_PUBLIC_API_BASE_URL` to the production HTTPS API.
- [ ] Set vendor and admin `NEXT_PUBLIC_API_BASE_URL` to the production HTTPS API.
- [x] Approved KariGO logo/assets exist in all apps.
- [ ] Build signed customer and rider release candidates.
- [ ] Complete physical-device testing on target Android/iOS versions.
- [ ] Configure dashboard hosting, HTTPS, domains, headers, and cache policy.
- [ ] Replace browser-local JWT storage with hardened production session handling.

## Security

- [ ] No default or shared admin password exists in production.
- [ ] Change initial admin credentials immediately after provisioning.
- [ ] Confirm secrets and `.env` files are not committed.
- [ ] Verify logs never expose passwords, OTPs, JWTs, webhook secrets, or payment data.
- [x] Payment amounts and promo discounts are recalculated server-side.
- [x] Admin routes, vendor orders, rider jobs, and customer-owned records are protected.
- [x] Customer support responses exclude internal notes.
- [ ] Complete external security/privacy review and access-recovery rehearsal.
